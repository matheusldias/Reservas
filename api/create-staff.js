import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_ROLES = ["admin", "gerente", "hostess"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }
  if (!SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: "service role não configurada" });
  }

  // 1. Autenticação do solicitante
  const auth = req.headers.authorization || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return res.status(401).json({ ok: false, error: "sem token" });

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, error: "não autenticado" });
  }

  // 2. Cliente admin (service role) — só no servidor
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Só admin pode criar usuários
  const { data: callerProfile } = await admin
    .from("staff_profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (callerProfile?.role !== "admin") {
    return res.status(403).json({ ok: false, error: "apenas administradores podem criar usuários" });
  }

  // 4. Valida entrada
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role = body.role;
  const restaurant_id = body.restaurant_id || null;

  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ ok: false, error: "e-mail inválido" });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: "a senha precisa ter ao menos 6 caracteres" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: "função inválida" });
  }

  // 5. Cria o usuário (já confirmado, sem precisar verificar e-mail)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    const msg = /already.*registered|exists/i.test(createErr.message || "")
      ? "já existe um usuário com esse e-mail"
      : createErr.message;
    return res.status(400).json({ ok: false, error: msg });
  }

  // 6. Cria/atualiza o perfil (id = id do auth user)
  const { error: profileErr } = await admin.from("staff_profiles").upsert({
    id: created.user.id,
    email,
    role,
    restaurant_id,
  });
  if (profileErr) {
    // desfaz o usuário órfão para não deixar conta sem perfil
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return res.status(400).json({ ok: false, error: "falha ao criar o perfil: " + profileErr.message });
  }

  return res.status(200).json({ ok: true });
}
