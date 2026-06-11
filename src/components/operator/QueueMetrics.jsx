import React from "react";
import { Users, Hourglass, Timer, AlertTriangle } from "lucide-react";

export default function QueueMetrics({ entries }) {
  const waiting = entries.filter((e) => e.status === "aguardando");
  const totalPeople = waiting.reduce((sum, e) => sum + (e.party_size || 0), 0);
  const noShows = entries.filter((e) => e.status === "no_show").length;

  const seated = entries.filter((e) => e.status === "sentado" && e.seated_at);
  const avgWait =
    seated.length > 0
      ? Math.round(
          seated.reduce(
            (sum, e) =>
              sum + (new Date(e.seated_at) - new Date(e.created_date)) / 60000,
            0
          ) / seated.length
        )
      : null;

  const metrics = [
    { icon: Hourglass, label: "Aguardando", value: waiting.length },
    { icon: Users, label: "Pessoas na fila", value: totalPeople },
    { icon: Timer, label: "Espera média", value: avgWait !== null ? `${avgWait}min` : "—" },
    { icon: AlertTriangle, label: "No-shows hoje", value: noShows },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5"
        >
          <m.icon className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-tight">{m.value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}