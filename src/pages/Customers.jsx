import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/lib/RestaurantContext";
import { useAuth } from "@/lib/AuthContext";
import { getAppRole } from "@/lib/roles";
import { formatPhoneMask } from "@/lib/phone";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Contact, Search, Pencil, Trash2, Star, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import CustomerEditDialog from "@/components/customers/CustomerEditDialog";

export default function Customers() {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const role = getAppRole(user);
  const canEdit = role === "admin" || role === "gerente";

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const { data: customers = [], refetch } = useQuery({
    queryKey: ["customers", restaurant?.id],
    queryFn: () =>
      base44.entities.Customer.filter(
        { restaurant_id: restaurant.id },
        "-updated_date",
        500
      ),
    enabled: !!restaurant,
  });

  const term = search.toLowerCase().trim();
  const termDigits = term.replace(/\D/g, "");
  const filtered = customers.filter((c) => {
    if (!term) return true;
    const byName = (c.name || "").toLowerCase().includes(term);
    const byPhone = termDigits && (c.phone || "").includes(termDigits);
    return byName || byPhone;
  });

  const handleDelete = async (c) => {
    await base44.entities.Customer.delete(c.id);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Contact className="w-6 h-6 text-primary" />
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico e dados dos clientes do restaurante
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="rounded-xl pl-9"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  {c.name}
                  {c.vip && (
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatPhoneMask(c.phone)}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {c.visits_count || 0} visita{(c.visits_count || 0) !== 1 ? "s" : ""}
                  </Badge>
                  {(c.no_show_count || 0) > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      {c.no_show_count} no-show{c.no_show_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {c.last_visit_date && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Última: {format(new Date(c.last_visit_date + "T12:00:00"), "dd/MM/yyyy")}
                    </Badge>
                  )}
                  {(c.tags || []).map((t) => (
                    <Badge key={t} className="bg-accent text-accent-foreground border-0 text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
                {c.notes && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mt-2">
                    {c.notes}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <Contact className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      <CustomerEditDialog
        customer={editing}
        onClose={() => setEditing(null)}
        onSaved={refetch}
      />
    </div>
  );
}