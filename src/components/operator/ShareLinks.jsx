import React from "react";
import { Button } from "@/components/ui/button";
import { Link2, Copy, CalendarClock, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ShareLinks({ restaurant }) {
  const { toast } = useToast();

  const reserveLink = `${window.location.origin}/reservar`;
  const queueLink = restaurant ? `${window.location.origin}/fila/${restaurant.id}` : "";

  const copy = (link, label) => {
    navigator.clipboard.writeText(link);
    toast({ title: `${label} copiado!` });
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Links para clientes</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Link de Reserva</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Cliente escolhe a loja
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(reserveLink, "Link de reserva")}
            className="rounded-lg text-xs shrink-0"
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Link da Fila</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {restaurant?.name || "Selecione uma loja"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!restaurant}
            onClick={() => copy(queueLink, "Link da fila")}
            className="rounded-lg text-xs shrink-0"
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
          </Button>
        </div>
      </div>
    </div>
  );
}