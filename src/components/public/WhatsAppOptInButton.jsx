import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const BUSINESS_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER;

// Botão que abre o WhatsApp do cliente já com mensagem pronta PRO número do
// negócio. Ao enviar, o cliente abre a janela de 24h (avisos viram grátis).
export default function WhatsAppOptInButton({ label = "Ativar avisos no WhatsApp" }) {
  if (!BUSINESS_NUMBER) return null;
  const text = encodeURIComponent(
    "Olá! Quero receber os avisos da minha fila/reserva por aqui. 🍕"
  );
  const href = `https://wa.me/${BUSINESS_NUMBER}?text=${text}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white">
        <MessageCircle className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </a>
  );
}
