import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRestaurant } from "@/lib/RestaurantContext";
import { useAuth } from "@/lib/AuthContext";
import { getAppRole, ROLE_LABELS } from "@/lib/roles";
import InviteUserDialog from "@/components/admin/InviteUserDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurants } = useRestaurant();
  const { user: currentUser } = useAuth();
  const isAdmin = getAppRole(currentUser) === "admin";
  const [showInvite, setShowInvite] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Gerente vê apenas a equipe do próprio restaurante
  const users = isAdmin
    ? allUsers
    : allUsers.filter((u) => u.restaurant_id === currentUser?.restaurant_id);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const updateUser = async (u, data, message) => {
    await supabase.from("staff_profiles").update(data).eq("id", u.id);
    refetch();
    toast({ title: message });
  };

  const roleBadge = (u) => {
    const role = getAppRole(u);
    if (role === "admin")
      return <Badge className="bg-primary/10 text-primary">Administrador</Badge>;
    if (role)
      return (
        <Badge className="bg-secondary text-secondary-foreground">
          {ROLE_LABELS[role]}
        </Badge>
      );
    return <Badge variant="outline">Sem papel</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" />
            Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Convide usuários e defina o restaurante e o papel de cada um"
              : "Equipe do seu restaurante"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowInvite(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" />
            Convidar Usuário
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.full_name || "Sem nome"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {roleBadge(u)}
              {isAdmin && u.role !== "admin" ? (
                <Select
                  value={u.app_role || ""}
                  onValueChange={(value) =>
                    updateUser(u, { app_role: value }, "Papel atualizado!")
                  }
                >
                  <SelectTrigger className="rounded-xl w-32 h-9 text-xs">
                    <SelectValue placeholder="Papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="hostess">Hostess</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {isAdmin ? (
                <Select
                  value={u.restaurant_id || ""}
                  onValueChange={(value) =>
                    updateUser(u, { restaurant_id: value }, "Restaurante atribuído!")
                  }
                >
                  <SelectTrigger className="rounded-xl w-48 h-9 text-xs">
                    <SelectValue placeholder="Sem restaurante" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {restaurants.find((r) => r.id === u.restaurant_id)?.name ||
                    "Sem restaurante"}
                </span>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      <InviteUserDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        restaurants={restaurants}
        onInvited={refetch}
      />
    </div>
  );
}
