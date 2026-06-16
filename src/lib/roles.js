// Papel efetivo do usuário, lido da coluna `role` de staff_profiles:
// "admin", "gerente" ou "hostess".
export function getAppRole(user) {
  if (!user) return null;
  const r = user.role;
  if (r === "admin" || r === "gerente" || r === "hostess") return r;
  return null;
}

export const ROLE_LABELS = {
  admin: "Administrador",
  gerente: "Gerente",
  hostess: "Hostess",
};
