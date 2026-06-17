import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Users, Phone, CheckCircle, XCircle, Armchair, AlertTriangle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import CancelReservationDialog from "./CancelReservationDialog";
import { recordVisit, recordNoShow } from "@/lib/customers";
import { notifyReservationConfirmation } from "@/lib/whatsapp";
import { fromMinutes } from "@/lib/capacity";

const statusConfig = {
  aguardando: { label: "Aguardando", class: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmada: { label: "Confirmada", class: "bg-blue-100 text-blue-700 border-blue-200" },
  sentada: { label: "Sentada", class: "bg-green-100 text-green-700 border-green-200" },
  concluida: { label: "Concluída", class: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelada: { label: "Cancelada", class: "bg-red-100 text-red-700 border-red-200" },
  no_show: { label: "No-show", class: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function ReservationList({ reservations, onUpdate }) {
  const [cancelTarget, setCancelTarget] = useState(null);

  const handleStatus = async (id, newStatus, extra = {}) => {
    await supabase.from("reservations").update({ status: newStatus, ...extra }).eq("id", id);
    onUpdate();
  };

  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelada" && r.status !== "no_show" && r.status !== "concluida"
  );

  const pastReservations = reservations.filter(
    (r) => r.status === "cancelada" || r.status === "no_show" || r.status === "concluida"
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
    const isSeated = res.status === "sentada";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">{res.customer_name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {fromMinutes(res.start_min)}
                  {res.duration_minutes ? ` · ${res.duration_minutes}min` : ""}
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
          {res.status === "cancelada" && res.cancellation_reason && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              Motivo: {res.cancellation_reason}
            </p>
          )}
          {isActive && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  handleStatus(res.id, "sentada", { seated_at: new Date().toISOString() })
                }
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
              >
                <Armchair className="w-3.5 h-3.5 mr-1" />
                Sentar
              </Button>
              {res.status === "aguardando" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await handleStatus(res.id, "confirmada");
                    notifyReservationConfirmation(res); // fire-and-forget
                  }}
                  className="flex-1 rounded-xl text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Confirmar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelTarget(res)}
                className="rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await handleStatus(res.id, "no_show");
                  await recordNoShow(res.customer_id);
                  onUpdate();
                }}
                className="rounded-xl text-xs border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {isSeated && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await handleStatus(res.id, "concluida", {
                    completed_at: new Date().toISOString(),
                  });
                  await recordVisit(res.customer_id);
                  onUpdate();
                }}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs"
              >
                <Flag className="w-3.5 h-3.5 mr-1" />
                Concluir
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

      <CancelReservationDialog
        reservation={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={onUpdate}
      />
    </div>
  );
}