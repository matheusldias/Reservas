import { supabase } from "@/lib/supabase";
import { normalizePhone } from "./phone";
import { format } from "date-fns";

// Busca ou cria o cliente pelo telefone normalizado e retorna o id.
// Fail-safe: nunca lança erro (a página pública da fila não pode falhar por RLS).
export async function linkCustomer(restaurantId, { name, phone, email }) {
  const normalized = normalizePhone(phone);
  if (!restaurantId || !normalized || normalized.length < 12) return null;
  try {
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("phone", normalized)
      .limit(1);

    if (existing && existing.length > 0) {
      const c = existing[0];
      const updates = {};
      if (name && !c.name) updates.name = name;
      if (email && !c.email) updates.email = email;
      if (Object.keys(updates).length > 0) {
        await supabase.from("customers").update(updates).eq("id", c.id);
      }
      return c.id;
    }

    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        name: name || "Cliente",
        phone: normalized,
        ...(email ? { email } : {}),
        restaurant_id: restaurantId,
      })
      .select()
      .single();

    if (error) throw error;
    return created.id;
  } catch {
    return null;
  }
}

// Vincula o cliente a uma entrada da fila no momento em que a equipe (autenticada)
// interage com ela — cobre entradas criadas pela página pública sem permissão de criar Customer.
export async function ensureWaitlistCustomer(entry) {
  if (!entry) return null;
  if (entry.customer_id) return entry.customer_id;
  if (!entry.customer_phone) return null;
  const customerId = await linkCustomer(entry.restaurant_id, {
    name: entry.customer_name,
    phone: entry.customer_phone,
    email: entry.customer_email,
  });
  if (customerId) {
    await supabase
      .from("waitlist_entries")
      .update({ customer_id: customerId })
      .eq("id", entry.id);
  }
  return customerId;
}

export async function recordVisit(customerId) {
  if (!customerId) return;
  const { data: rows } = await supabase
    .from("customers")
    .select("visits_count")
    .eq("id", customerId)
    .single();
  if (!rows) return;
  await supabase
    .from("customers")
    .update({
      visits_count: (rows.visits_count || 0) + 1,
      last_visit_date: format(new Date(), "yyyy-MM-dd"),
    })
    .eq("id", customerId);
}

export async function recordNoShow(customerId) {
  if (!customerId) return;
  const { data: rows } = await supabase
    .from("customers")
    .select("no_show_count")
    .eq("id", customerId)
    .single();
  if (!rows) return;
  await supabase
    .from("customers")
    .update({ no_show_count: (rows.no_show_count || 0) + 1 })
    .eq("id", customerId);
}
