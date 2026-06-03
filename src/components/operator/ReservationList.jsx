import React from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Users, Phone, CheckCircle, XCircle, Armchair, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig = {
  aguardando: { label: "Aguardando", class: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmada: { label: "Confirmada", class: "bg-blue-100 text-blue-700 border-blue-200" },
  sentada: { label: "Sentada", class: "bg-green-100 text-green-700 border-green-200" },
  cancelada: { label: "Cancelada", class: "bg-red-100 text-red-700 border-red-200" },
  no_show: { label: "No-show", class: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function ReservationList({ reservations, onUpdate }) {
  const handleStatus = async (id, newStatus) => {
    await base44.entities.Reservation.update(id, { status: newStatus });
    onUpdate();
  };

  const activeReservations = reservations.filter(
    (r) => r.status !== "sentada" && r.status !== "cancelada" && r.status !== "no_show"
  );

  const pastReservations = reservations.filter(
    (r) => r.status === "sentada" || r.status === "cancelada" || r.status === "no_show"
  );

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma reserva para esta data</p>
      </div>
    );
  }

  const ReservationCard = ({ res }) => {
    const status = statusConfig[res.status] || statusConfig.aguardando;
    const isActive = res.status === "aguardando" || res.status === "confirmada";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${
          res.status === "chamado" ? "border-primary" : "border-border"
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">{res.customer_name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {res.time}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {res.party_size}p
                </span>
                {res.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {res.customer_phone}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`${status.class} border text-xs`}>
              {status.label}
            </Badge>
          </div>
          {res.notes && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3">
              {res.notes}
            </p>
          )}
          {isActive && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleStatus(res.id, "sentada")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
              >
                <Armchair className="w-3.5 h-3.5 mr-1" />
                Sentar
              </Button>
              {res.status === "aguardando" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatus(res.id, "confirmada")}
                  className="flex-1 rounded-xl text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Confirmar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus(res.id, "cancelada")}
                className="rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus(res.id, "no_show")}
                className="rounded-xl text-xs border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {activeReservations.map((res) => (
          <ReservationCard key={res.id} res={res} />
        ))}
      </AnimatePresence>

      {pastReservations.length > 0 && (
        <div className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Finalizadas
          </p>
          <div className="space-y-2 opacity-60">
            {pastReservations.map((res) => (
              <ReservationCard key={res.id} res={res} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}