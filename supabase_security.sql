-- =====================================================================
-- SEGURANÇA COMPLETA — Reservas Pizza Bis
-- Rode TUDO de uma vez no Supabase → SQL Editor
-- =====================================================================
-- Modelo:
--   * anon (internet/público): SEM acesso direto a nenhuma tabela.
--     Só pode chamar as funções public_* (RPC) que retornam o mínimo.
--   * authenticated (equipe logada): RLS ligado, acesso às tabelas
--     operacionais; staff_profiles protegido contra auto-promoção.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. HELPERS (SECURITY DEFINER — leem staff_profiles sem cair no RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.my_restaurant_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select restaurant_id from public.staff_profiles where id = auth.uid();
$$;

-- helpers internos não devem ser chamáveis pelo público
revoke all on function public.is_admin(), public.my_restaurant_id() from public, anon;
grant execute on function public.is_admin(), public.my_restaurant_id() to authenticated;


-- ---------------------------------------------------------------------
-- 2. LIGAR RLS EM TODAS AS TABELAS
-- ---------------------------------------------------------------------
alter table public.restaurants       enable row level security;
alter table public.dining_rooms      enable row level security;
alter table public.reservations      enable row level security;
alter table public.waitlist_entries  enable row level security;
alter table public.customers         enable row level security;
alter table public.staff_profiles    enable row level security;
alter table public.notification_log  enable row level security;
alter table public.audit_log         enable row level security;


-- ---------------------------------------------------------------------
-- 3. REVOGAR TODO ACESSO DIRETO DO ANON (passa a usar só RPC)
-- ---------------------------------------------------------------------
revoke all on public.restaurants      from anon;
revoke all on public.dining_rooms     from anon;
revoke all on public.reservations     from anon;
revoke all on public.waitlist_entries from anon;
revoke all on public.customers        from anon;
revoke all on public.staff_profiles   from anon;
revoke all on public.notification_log from anon;
revoke all on public.audit_log        from anon;


-- ---------------------------------------------------------------------
-- 4. POLICIES PARA A EQUIPE (authenticated)
-- ---------------------------------------------------------------------
-- Tabelas operacionais: equipe logada tem acesso total.
do $$
declare t text;
begin
  foreach t in array array[
    'restaurants','dining_rooms','reservations',
    'waitlist_entries','customers','notification_log','audit_log'
  ]
  loop
    execute format('drop policy if exists staff_all on public.%I;', t);
    execute format(
      'create policy staff_all on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end$$;

-- staff_profiles: leitura do próprio / mesma loja / admin; escrita só admin.
drop policy if exists sp_select on public.staff_profiles;
create policy sp_select on public.staff_profiles
  for select to authenticated
  using (id = auth.uid() or is_admin() or restaurant_id = my_restaurant_id());

drop policy if exists sp_insert on public.staff_profiles;
create policy sp_insert on public.staff_profiles
  for insert to authenticated
  with check (is_admin());

drop policy if exists sp_update on public.staff_profiles;
create policy sp_update on public.staff_profiles
  for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists sp_delete on public.staff_profiles;
create policy sp_delete on public.staff_profiles
  for delete to authenticated
  using (is_admin());


-- ---------------------------------------------------------------------
-- 5. FUNÇÕES PÚBLICAS (RPC) — única porta de entrada do anon
-- ---------------------------------------------------------------------

-- 5.1 Lista de unidades (página "escolher restaurante")
create or replace function public.public_list_restaurants()
returns table (id uuid, name text, address text)
language sql security definer stable
set search_path = public
as $$
  select id, name, address from public.restaurants order by name;
$$;

-- 5.2 Dados públicos de uma unidade
create or replace function public.public_get_restaurant(p_id uuid)
returns table (
  id uuid, name text, address text, phone text, opening_hours text,
  booking_window_days int, default_duration_minutes int,
  booking_rules text, queue_paused boolean
)
language sql security definer stable
set search_path = public
as $$
  select id, name, address, phone, opening_hours,
         booking_window_days, default_duration_minutes,
         booking_rules, queue_paused
  from public.restaurants where id = p_id;
$$;

-- 5.3 Salões de uma unidade (para escolher horário) — sem dados sensíveis
create or replace function public.public_get_dining_rooms(p_restaurant_id uuid)
returns table (
  id uuid, name text, type text, total_capacity int,
  schedule jsonb, special_dates jsonb, blocked_dates jsonb
)
language sql security definer stable
set search_path = public
as $$
  select id, name, type, total_capacity, schedule, special_dates, blocked_dates
  from public.dining_rooms
  where restaurant_id = p_restaurant_id and coalesce(active, true) = true;
$$;

-- 5.4 Ocupação de um salão numa data (para checar capacidade) — SEM PII
create or replace function public.public_room_occupancy(
  p_restaurant_id uuid, p_dining_room_id uuid, p_date date)
returns table (start_min int, duration_minutes int, party_size int,
               status text, dining_room_id uuid, date date)
language sql security definer stable
set search_path = public
as $$
  select start_min, duration_minutes, party_size, status, dining_room_id, date
  from public.reservations
  where restaurant_id = p_restaurant_id
    and dining_room_id = p_dining_room_id
    and date = p_date;
$$;

-- 5.5 Criar reserva (vincula cliente no servidor) → retorna id da reserva
create or replace function public.public_create_reservation(
  p_restaurant_id uuid, p_dining_room_id uuid,
  p_name text, p_phone text, p_email text,
  p_date date, p_start_min int, p_duration_minutes int, p_party_size int)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_customer_id uuid; v_id uuid;
begin
  -- valida que a unidade/salão existem e batem
  if not exists (select 1 from public.dining_rooms
                 where id = p_dining_room_id and restaurant_id = p_restaurant_id) then
    raise exception 'sala invalida';
  end if;

  -- find-or-create do cliente pelo telefone
  if p_phone is not null and length(p_phone) >= 12 then
    select id into v_customer_id from public.customers
      where restaurant_id = p_restaurant_id and phone = p_phone limit 1;
    if v_customer_id is null then
      insert into public.customers (restaurant_id, name, phone, email)
        values (p_restaurant_id, coalesce(nullif(p_name,''),'Cliente'), p_phone, nullif(p_email,''))
        returning id into v_customer_id;
    end if;
  end if;

  insert into public.reservations
    (restaurant_id, dining_room_id, customer_id, customer_name, customer_phone,
     customer_email, date, start_min, duration_minutes, party_size, status, origin)
  values
    (p_restaurant_id, p_dining_room_id, v_customer_id, p_name, coalesce(p_phone,''),
     coalesce(p_email,''), p_date, p_start_min, p_duration_minutes, p_party_size,
     'aguardando', 'online')
  returning id into v_id;

  return v_id;
end;
$$;

-- 5.6 Entrar na fila (vincula cliente no servidor) → retorna id + posição
create or replace function public.public_join_queue(
  p_restaurant_id uuid, p_name text, p_phone text,
  p_party_size int, p_service_date date)
returns table (id uuid, queue_position int)
language plpgsql security definer
set search_path = public
as $$
#variable_conflict use_column
declare v_customer_id uuid; v_id uuid;
begin
  -- respeita fila pausada
  if exists (select 1 from public.restaurants
             where id = p_restaurant_id and queue_paused = true) then
    raise exception 'fila pausada';
  end if;

  if p_phone is not null and length(p_phone) >= 12 then
    select c.id into v_customer_id from public.customers c
      where c.restaurant_id = p_restaurant_id and c.phone = p_phone limit 1;
    if v_customer_id is null then
      insert into public.customers (restaurant_id, name, phone)
        values (p_restaurant_id, coalesce(nullif(p_name,''),'Cliente'), p_phone)
        returning customers.id into v_customer_id;
    end if;
  end if;

  insert into public.waitlist_entries
    (restaurant_id, customer_id, customer_name, customer_phone,
     party_size, status, service_date)
  values
    (p_restaurant_id, v_customer_id, p_name, coalesce(p_phone,''),
     p_party_size, 'aguardando', p_service_date)
  returning waitlist_entries.id into v_id;

  return query
    select v_id, (
      select count(*)::int from public.waitlist_entries w
      where w.restaurant_id = p_restaurant_id
        and w.service_date = p_service_date
        and w.status = 'aguardando'
        and (case when w.priority then 0 else 1 end, w.created_at) <=
            (select case when x.priority then 0 else 1 end, x.created_at
             from public.waitlist_entries x where x.id = v_id)
    );
end;
$$;

-- 5.7 Status da própria entrada na fila (posição calculada no servidor)
create or replace function public.public_queue_status(p_entry_id uuid)
returns table (status text, customer_name text, party_size int, queue_position int)
language plpgsql security definer stable
set search_path = public
as $$
#variable_conflict use_column
declare v_rid uuid; v_date date; v_prio boolean; v_created timestamptz;
begin
  select e.restaurant_id, e.service_date, e.priority, e.created_at
    into v_rid, v_date, v_prio, v_created
  from public.waitlist_entries e where e.id = p_entry_id;

  if not found then return; end if;

  return query
  select
    we.status::text,
    we.customer_name,
    we.party_size,
    case when we.status = 'aguardando' then (
      select count(*)::int from public.waitlist_entries w
      where w.restaurant_id = v_rid and w.service_date = v_date
        and w.status = 'aguardando'
        and (case when w.priority then 0 else 1 end, w.created_at)
            <= (case when v_prio then 0 else 1 end, v_created)
    ) else 0 end
  from public.waitlist_entries we where we.id = p_entry_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. PERMISSÃO DE EXECUÇÃO DAS RPC PARA O ANON
-- ---------------------------------------------------------------------
revoke all on function
  public.public_list_restaurants(),
  public.public_get_restaurant(uuid),
  public.public_get_dining_rooms(uuid),
  public.public_room_occupancy(uuid, uuid, date),
  public.public_create_reservation(uuid, uuid, text, text, text, date, int, int, int),
  public.public_join_queue(uuid, text, text, int, date),
  public.public_queue_status(uuid)
from public;

grant execute on function
  public.public_list_restaurants(),
  public.public_get_restaurant(uuid),
  public.public_get_dining_rooms(uuid),
  public.public_room_occupancy(uuid, uuid, date),
  public.public_create_reservation(uuid, uuid, text, text, text, date, int, int, int),
  public.public_join_queue(uuid, text, text, int, date),
  public.public_queue_status(uuid)
to anon, authenticated;
-- =====================================================================
-- FIM
-- =====================================================================
