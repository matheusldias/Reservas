import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/lib/RestaurantContext";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, CalendarCheck, Users, UserX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Reports() {
  const [days, setDays] = useState(7);
  const { restaurant } = useRestaurant();

  const { data: reservations = [] } = useQuery({
    queryKey: ["all-reservations", restaurant?.id],
    queryFn: () =>
      base44.entities.Reservation.filter(
        { restaurant_id: restaurant.id },
        "-date",
        500
      ),
    enabled: !!restaurant,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);

    const filtered = reservations.filter(
      (r) => new Date(r.date) >= startDate && new Date(r.date) <= now
    );

    const totalReservations = filtered.length;
    const attended = filtered.filter((r) => r.status === "sentada").length;
    const noShows = filtered.filter((r) => r.status === "no_show").length;

    // Group by day
    const byDay = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(now, days - 1 - i), "yyyy-MM-dd");
      byDay[d] = { date: d, total: 0, attended: 0, noShows: 0 };
    }

    filtered.forEach((r) => {
      if (byDay[r.date]) {
        byDay[r.date].total++;
        if (r.status === "sentada") byDay[r.date].attended++;
        if (r.status === "no_show") byDay[r.date].noShows++;
      }
    });

    const chartData = Object.values(byDay).map((d) => ({
      ...d,
      label: format(new Date(d.date + "T12:00:00"), "dd/MM", { locale: ptBR }),
    }));

    return { totalReservations, attended, noShows, chartData };
  }, [reservations, days]);

  const statCards = [
    {
      label: "Total de Reservas",
      value: stats.totalReservations,
      icon: CalendarCheck,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Clientes Atendidos",
      value: stats.attended,
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "No-shows",
      value: stats.noShows,
      icon: UserX,
      color: "bg-red-100 text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do desempenho
        </p>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Reservas por Dia</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="total"
                name="Total"
                fill="hsl(25, 95%, 53%)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="attended"
                name="Atendidos"
                fill="hsl(142, 60%, 45%)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="noShows"
                name="No-shows"
                fill="hsl(0, 70%, 55%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}