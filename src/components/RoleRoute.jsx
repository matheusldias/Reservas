import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getAppRole } from "@/lib/roles";

// Protege rotas por papel. Redireciona para o painel se o papel não tiver acesso.
export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  const role = getAppRole(user);
  if (!roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}