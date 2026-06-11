import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Bell, Armchair, UserX } from "lucide-react";

export default function QueueStatusCard({ entry, position }) {
  if (!entry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const partyLabel = `${entry.party_size} ${entry.party_size === 1 ? "pessoa" : "pessoas"}`;

  let content;
  if (entry.status === "chamado") {
    content = (
      <>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="bg-green-500 rounded-2xl py-8 px-4 my-4 text-white"
        >
          <Bell className="w-10 h-10 mx-auto mb-3" />
          <p className="text-2xl font-bold">É a sua vez! 🎉</p>
          <p className="text-sm mt-2 opacity-90">Dirija-se à recepção</p>
        </motion.div>
        <p className="text-sm text-muted-foreground">
          {entry.customer_name} · {partyLabel}
        </p>
      </>
    );
  } else if (entry.status === "sentado") {
    content = (
      <>
        <Armchair className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Você já foi atendido. Boa refeição! 🍕
        </h2>
        <p className="text-sm text-muted-foreground">
          {entry.customer_name} · {partyLabel}
        </p>
      </>
    );
  } else if (entry.status === "removido" || entry.status === "no_show") {
    content = (
      <>
        <UserX className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Você saiu da fila</h2>
        <p className="text-sm text-muted-foreground">
          Se ainda quiser uma mesa, fale com a recepção.
        </p>
      </>
    );
  } else {
    // aguardando
    content = (
      <>
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Você está na fila!</h2>
        <div className="bg-accent rounded-2xl py-6 my-4">
          <p className="text-xs text-accent-foreground uppercase tracking-wide mb-1">
            Sua posição
          </p>
          <p className="text-5xl font-bold text-primary">
            {position > 0 ? `${position}º` : "—"}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {entry.customer_name} · {partyLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Aguarde ser chamado pela equipe do restaurante. Esta tela atualiza
          automaticamente.
        </p>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {content}
      </div>
    </div>
  );
}