import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Store, Plus, Edit2, Trash2, CalendarClock, Users, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import RestaurantFormDialog from "@/components/admin/RestaurantFormDialog";
import { useAuth } from "@/lib/AuthContext";
import { getAppRole } from "@/lib/roles";

export default function RestaurantSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = getAppRole(user) === "admin";
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => base44.entities.Restaurant.list(),
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });

  const handleDelete = async (r) => {
    await base44.entities.Restaurant.delete(r.id);
    refetch();
    toast({ title: "Restaurante removido!" });
  };

  const copyLink = (path, label) => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast({ title: `Link de ${label} copiado!` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Restaurantes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie seus restaurantes
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setShowDialog(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo Restaurante
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {restaurants.map((r) => (
          <div key={r.id} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{r.name}</h3>
                {r.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">{r.address}</p>
                )}
                {r.phone && (
                  <p className="text-sm text-muted-foreground">{r.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(r);
                    setShowDialog(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(r)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyLink(`/reservar/${r.id}`, "reserva")}
                className="rounded-xl text-xs"
              >
                <CalendarClock className="w-3.5 h-3.5 mr-1 text-primary" />
                <Copy className="w-3 h-3 mr-1" />
                Link de Reserva
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyLink(`/fila/${r.id}`, "fila")}
                className="rounded-xl text-xs"
              >
                <Users className="w-3.5 h-3.5 mr-1 text-primary" />
                <Copy className="w-3 h-3 mr-1" />
                Link da Fila
              </Button>
            </div>
          </div>
        ))}

        {restaurants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum restaurante cadastrado</p>
          </div>
        )}
      </div>

      <RestaurantFormDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        restaurant={editing}
        onSaved={refetch}
      />
    </div>
  );
}