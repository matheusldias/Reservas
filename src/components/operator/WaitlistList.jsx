import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Phone, Bell, Armchair, X, MessageCircle, Star, Timer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { sortQueue, minutesSince } from "@/lib/queue";
import RemoveWaitlistDialog from "./RemoveWaitlistDialog";
import { recordVisit, recordNoShow, ensureWaitlistCustomer } from "@/lib/customers";
import { notifyQueueCall } from "@/lib/whatsapp";

export default function WaitlistList({ entries, onUpdate, callTimeoutMinutes = 5 }) {
  const [, setTick] = useState(0);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const handleStatus = async (id, newStatus, extra = {}) => {
    await supabase.from("waitlist_entries").update({ status: newStatus, ...extra }).eq("id", id);
    onUpdate();
  };

  const handleCall = async (entry) => {
    await ensureWaitlistCustomer(entry);
    await handleStatus(entry.id, "chamado", { called_at: new Date().toISOString() });
    notifyQueueCall(entry); // fire-and-forget
  };

  // Fallback manual: abre o WhatsApp pro operador enviar na mão.
  const handleManualWhatsApp = (entry) => {
    if (!entry.customer_phone) return;
    const phone = entry.customer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${entry.customer_name}! 🎉 Sua vez chegou! Sua mesa para ${entry.party_size} pessoa(s) está pronta. Por favor, dirija-se à recepção.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum cliente na fila</p>
      </div>
    );
  }

  const sorted = sortQueue(entries);
  const waitingOrder = sortQueue(entries.filter((e) => e.status === "aguardando"));
  const positionOf = (id) => waitingOrder.findIndex((e) => e.id === id) + 1;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {sorted.map((entry) => {
          const isCalled = entry.status === "chamado";
          const calledMinutes = isCalled ? minutesSince(entry.called_at) : 0;
          const isOverdue = isCalled && entry.called_at && calledMinutes > callTimeoutMinutes;
          const waitMinutes = minutesSince(entry.created_at);
          const position = entry.status === "aguardando" ? positionOf(entry.id) : null;

          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${
                isOverdue
                  ? "border-red-400 ring-2 ring-red-200"
                  : isCalled
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isOverdue
                          ? "bg-red-500 text-white animate-pulse"
                          : isCalled
                          ? "bg-primary text-primary-foreground animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {position ? `${position}º` : <Bell className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                        {entry.customer_name}
                        {entry.priority && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {entry.party_size}p
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" />
                          {waitMinutes}min
                        </span>
                        {entry.quoted_wait_minutes ? (
                          <span className="text-xs">
                            Est: {entry.quoted_wait_minutes}min
                          </span>
                        ) : null}
                        {entry.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {entry.customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOverdue ? (
                    <Badge className="bg-red-500 text-white border-0 text-xs animate-pulse">
                      Chamado há {calledMinutes}min
                    </Badge>
                  ) : isCalled ? (
                    <Badge className="bg-primary text-primary-foreground border-0 text-xs animate-pulse">
                      Chamado
                    </Badge>
                  ) : null}
                </div>

                {entry.notes && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3">
                    {entry.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  {!isCalled && (
                    <Button
                      size="sm"
                      onClick={() => handleCall(entry)}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs"
                    >
                      <Bell className="w-3.5 h-3.5 mr-1" />
                      Mesa Pronta
                    </Button>
                  )}
                  {isCalled && entry.customer_phone && (
                    <Button
                      size="sm"
                      onClick={() => handleManualWhatsApp(entry)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      const customerId = await ensureWaitlistCustomer(entry);
                      await handleStatus(entry.id, "sentado", {
                        seated_at: new Date().toISOString(),
                      });
                      await recordVisit(customerId);
                      onUpdate();
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
                  >
                    <Armchair className="w-3.5 h-3.5 mr-1" />
                    Sentar
                  </Button>
                  {isOverdue && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const customerId = await ensureWaitlistCustomer(entry);
                        await handleStatus(entry.id, "no_show", {
                          removed_at: new Date().toISOString(),
                        });
                        await recordNoShow(customerId);
                        onUpdate();
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Marcar no-show
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemoveTarget(entry)}
                    className="rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <RemoveWaitlistDialog
        entry={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onSuccess={onUpdate}
      />
    </div>
  );
}