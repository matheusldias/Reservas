import React from "react";
import { base44 } from "@/api/base44Client";
import { Users, Phone, Bell, Armchair, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function WaitlistList({ entries, onUpdate }) {
  const handleStatus = async (id, newStatus) => {
    await base44.entities.WaitlistEntry.update(id, { status: newStatus });
    onUpdate();
  };

  const handleCall = async (entry) => {
    await handleStatus(entry.id, "chamado");
    if (entry.customer_phone) {
      const phone = entry.customer_phone.replace(/\D/g, "");
      const message = encodeURIComponent(
        `Olá ${entry.customer_name}! 🎉 Sua vez chegou! Sua mesa para ${entry.party_size} pessoa(s) está pronta. Por favor, dirija-se à recepção.`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum cliente na fila</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {entries.map((entry, index) => {
          const isCalled = entry.status === "chamado";
          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${
                isCalled
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isCalled
                          ? "bg-primary text-primary-foreground animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}º
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {entry.customer_name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {entry.party_size}p
                        </span>
                        {entry.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {entry.customer_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isCalled && (
                    <Badge className="bg-primary text-primary-foreground border-0 text-xs animate-pulse">
                      Chamado
                    </Badge>
                  )}
                </div>

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
                      onClick={() => handleCall(entry)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleStatus(entry.id, "sentado")}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs"
                  >
                    <Armchair className="w-3.5 h-3.5 mr-1" />
                    Sentar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatus(entry.id, "removido")}
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
    </div>
  );
}