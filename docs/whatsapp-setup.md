# Configuração WhatsApp (Meta Cloud API)

## Variáveis na Vercel (Settings → Environment Variables)
- `WHATSAPP_TOKEN` — token permanente (System User, permissão whatsapp_business_messaging)
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número (WhatsApp Manager)
- `WHATSAPP_VERIFY_TOKEN` — string à sua escolha (ex.: "pizzabis-verify-2026")
- `WHATSAPP_APP_SECRET` — App Secret (Meta App → Settings → Basic)
- `VITE_WHATSAPP_BUSINESS_NUMBER` — número do negócio só dígitos (ex.: 5544998609126)

## Templates (WhatsApp Manager → Modelos), categoria Utility, idioma pt_BR
- `fila_chamada`: Olá {{1}}! 🎉 Sua vez chegou! Sua mesa para {{2}} pessoa(s) está pronta. Por favor, dirija-se à recepção.
- `reserva_confirmacao`: Olá {{1}}! Sua reserva na Pizza Bis está confirmada para {{2}} às {{3}}, para {{4}} pessoa(s). Até logo! 🍕

## Webhook (Meta App → WhatsApp → Configuration)
- Callback URL: https://<seu-dominio-vercel>/api/whatsapp-webhook
- Verify token: o mesmo de WHATSAPP_VERIFY_TOKEN
- Assinar o campo: messages
