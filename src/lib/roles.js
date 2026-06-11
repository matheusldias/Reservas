// Papel efetivo do usuário: "admin" (role nativo), "gerente" ou "hostess" (app_role).
export function getAppRole(user) {
  if (!user) return null;
  if (user.role === "admin") return "admin";
  return user.app_role || null;
}

export const ROLE_LABELS = {
  admin: "Administrador",
  gerente: "Gerente",
  hostess: "Hostess",
};