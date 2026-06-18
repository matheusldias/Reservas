import React from "react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="Pizza Bis" className="w-10 h-10 rounded-xl object-contain" />
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Política de Privacidade
          </h1>
        </div>

        <div className="space-y-5 text-sm text-foreground/90 leading-relaxed">
          <p className="text-muted-foreground">Última atualização: junho de 2026</p>

          <p>
            Esta Política de Privacidade descreve como a <strong>Pizza Bis</strong> coleta,
            usa e protege os dados pessoais dos clientes que utilizam nosso sistema de
            reservas e fila de espera.
          </p>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              Dados que coletamos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome</li>
              <li>Número de telefone (celular)</li>
              <li>E-mail (quando informado)</li>
              <li>Informações da reserva ou da fila (data, horário, número de pessoas)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              Como usamos seus dados
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gerenciar sua reserva ou sua posição na fila de espera;</li>
              <li>
                Enviar avisos pelo WhatsApp sobre sua reserva ou quando sua mesa estiver
                pronta;
              </li>
              <li>Melhorar o atendimento e manter o histórico de visitas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              WhatsApp
            </h2>
            <p>
              Ao iniciar uma conversa com nosso número de WhatsApp, você concorda em
              receber mensagens relacionadas à sua reserva ou fila de espera. Você pode
              deixar de receber essas mensagens a qualquer momento respondendo "SAIR" ou
              entrando em contato com o restaurante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              Compartilhamento
            </h2>
            <p>
              Não vendemos nem compartilhamos seus dados com terceiros para fins de
              marketing. Os dados são utilizados apenas internamente para o funcionamento
              do serviço de reservas e fila.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              Seus direitos
            </h2>
            <p>
              Você pode solicitar a consulta, correção ou exclusão dos seus dados pessoais
              a qualquer momento entrando em contato com o restaurante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
              Contato
            </h2>
            <p>
              Para dúvidas sobre esta política ou sobre seus dados, fale com a equipe da
              Pizza Bis.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
