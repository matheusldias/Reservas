import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sortQueue } from "@/lib/queue";

const statusConfig = {
  aguardando: { label: "Aguardando", class: "bg-amber-100 text-amber-700 border-amber-200" },
  chamado: { label: "Chamado", class: "bg-blue-100 text-blue-700 border-blue-200" },
  sentado: { label: "Sentado", class: "bg-green-100 text-green-700 border-green-200" },
  removido: { label: "Removido", class: "bg-red-100 text-red-700 border-red-200" },
  no_show: { label: "No-show", class: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function WaitlistHistory({ restaurantId }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [] } = useQuery({
    queryKey: ["waitlist-history", restaurantId, date],
    queryFn: () =>
      base44.entities.WaitlistEntry.filter(
        { restaurant_id: restaurantId, service_date: date },
        "created_date",
        200
      ),
    enabled: !!restaurantId,
  });

  const sorted = sortQueue(entries);

  return (
    <div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground mb-4"
      />

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma entrada nesta data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry) => {
            const status = statusConfig[entry.status] || statusConfig.aguardando;
            return (
              <div
                key={entry.id}
                className="bg-card rounded-xl border border-border p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {entry.customer_name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {entry.party_size}p
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.created_date), "HH:mm")}
                    </span>
                    {entry.removal_reason && (
                      <span className="truncate">Motivo: {entry.removal_reason}</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`${status.class} border text-xs shrink-0`}>
                  {status.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}