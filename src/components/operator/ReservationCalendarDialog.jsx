import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User, CalendarDays } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isToday,
} from "date-fns";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function ReservationCalendarDialog({ open, onClose, restaurantId, onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [mode, setMode] = useState("reservas");

  const { data: reservations = [] } = useQuery({
    queryKey: ["all-reservations", restaurantId],
    queryFn: () => base44.entities.Reservation.filter({ restaurant_id: restaurantId }),
    enabled: open && !!restaurantId,
  });

  const countsByDate = useMemo(() => {
    const map = {};
    const openStatuses = ["aguardando", "confirmada", "sentada"];
    reservations.forEach((r) => {
      if (!openStatuses.includes(r.status)) return;
      if (!map[r.date]) map[r.date] = { reservas: 0, pessoas: 0 };
      map[r.date].reservas += 1;
      map[r.date].pessoas += r.party_size || 0;
    });
    return map;
  }, [reservations]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const handleDayClick = (day) => {
    onSelectDate(format(day, "yyyy-MM-dd"));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="sr-only">Calendário de Reservas</DialogTitle>

        {/* Navegação */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setViewDate(addMonths(viewDate, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <select
            value={viewDate.getMonth()}
            onChange={(e) =>
              setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))
            }
            className="border border-border rounded-lg px-2 py-1.5 text-sm font-medium bg-card text-foreground"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={viewDate.getFullYear()}
            onChange={(e) =>
              setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))
            }
            className="border border-border rounded-lg px-2 py-1.5 text-sm font-medium bg-card text-foreground"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Grade */}
        <div className="grid grid-cols-7 gap-1 mt-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const counts = countsByDate[key];
            const inMonth = isSameMonth(day, viewDate);
            const value = counts ? counts[mode] : 0;
            return (
              <button
                key={key}
                onClick={() => handleDayClick(day)}
                className={`relative h-11 rounded-lg text-sm font-medium transition-colors ${
                  isToday(day)
                    ? "bg-foreground text-background"
                    : inMonth
                    ? "text-foreground hover:bg-accent"
                    : "text-muted-foreground/40 hover:bg-muted"
                }`}
              >
                {format(day, "dd")}
                {value > 0 && (
                  <span className="absolute -top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {value}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">
              Visualizar datas por número de:
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={mode === "pessoas" ? "default" : "outline"}
                onClick={() => setMode("pessoas")}
                className="rounded-lg text-xs h-8"
              >
                <User className="w-3.5 h-3.5 mr-1" /> Pessoas
              </Button>
              <Button
                size="sm"
                variant={mode === "reservas" ? "default" : "outline"}
                onClick={() => setMode("reservas")}
                className="rounded-lg text-xs h-8"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1" /> Reservas
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleDayClick(new Date())}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            Ir para hoje
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}