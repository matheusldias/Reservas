# Reservas e Fila de Espera — Pizza Bis

Sistema multiunidade de reservas de mesa e fila de espera para uma rede de pizzarias, em produção em 3 unidades (Balneário Camboriú e Maringá). Substituiu um serviço de reservas contratado de terceiros.

**Em produção:** [reservas.pizzabis.com.br](https://reservas.pizzabis.com.br)

---

## O problema

A rede pagava mensalidade por uma plataforma de reservas genérica que não atendia dois pontos centrais da operação: a fila de espera presencial em noites de pico e o aviso automático ao cliente quando a mesa fica pronta. O controle de fila era feito em papel e caderno, e o cliente ficava preso na porta do restaurante esperando ser chamado.

## A solução

Uma aplicação própria com dois fluxos públicos independentes por unidade — reserva antecipada e entrada na fila — e um painel de operação em tempo real para a equipe do salão. O cliente entra na fila pelo celular, acompanha a posição e recebe mensagem no WhatsApp quando é chamado.

---

## Funcionalidades

**Fluxo público (cliente)**
- Reserva de mesa com escolha de data, horário e número de pessoas, respeitando a capacidade real do salão
- Entrada na fila de espera com acompanhamento da posição em tempo real
- Confirmação e chamada por WhatsApp via Meta Cloud API
- Links separados por unidade, sem necessidade de cadastro ou login

**Painel de operação (equipe)**
- Visão do dia com reservas ativas e fila corrente
- Chamada de clientes da fila com registro de no-show
- Gestão de salões, capacidade e grade horária por dia da semana, com datas especiais e bloqueios
- Regras configuráveis por unidade: janela de reserva, tolerância de atraso, duração padrão da reserva, tempo limite após a chamada
- Base de clientes com histórico de visitas
- Relatórios: reservas por dia, horários de pico, taxa de no-show e clientes atendidos por origem
- Controle de acesso por unidade e por papel (admin, gerente, operador)

---

## Arquitetura

```
Cliente (navegador)
        │
        ▼
React + Vite (SPA)  ──────────────┐
        │                         │
        │ RPC público             │ sessão autenticada (JWT)
        ▼                         ▼
Supabase / PostgreSQL      Vercel Functions
  · RLS em todas as          · /api/send-whatsapp
    tabelas                  · /api/whatsapp-webhook
  · funções public_*                 │
    como única porta                 ▼
    de entrada do anon       Meta WhatsApp Cloud API
```

**Stack:** React 18, Vite, TailwindCSS, shadcn/ui, React Query, React Router, Supabase (PostgreSQL + Auth), Vercel Functions (Node), Meta WhatsApp Cloud API.

### Modelo de segurança

O ponto mais sensível do projeto é que o fluxo público grava no banco sem usuário autenticado. A abordagem adotada:

- **RLS ligado em todas as tabelas** e acesso direto do papel `anon` revogado — o público não lê nem escreve em nenhuma tabela
- Toda a superfície pública passa por **funções `SECURITY DEFINER`** (`public_list_restaurants`, `public_get_restaurant`, `public_room_occupancy`, `public_create_reservation`, `public_join_queue`, `public_queue_status`) que retornam o mínimo necessário e validam as regras do lado do servidor
- A consulta de ocupação do salão devolve apenas horário, duração e tamanho do grupo — **sem nenhum dado pessoal**
- A posição na fila é calculada no servidor e só é consultável com o UUID da própria entrada
- O envio de WhatsApp exige JWT de operador logado; o webhook valida a assinatura `X-Hub-Signature-256` com o App Secret
- Helpers internos (`is_admin`, `my_restaurant_id`) têm execução revogada do `anon`

O script SQL de políticas não é versionado aqui por conter detalhes da instância.

---

## Papel da IA no desenvolvimento

O projeto foi construído em pair programming com IA (Claude), com o fluxo de trabalho organizado em três etapas versionadas em `docs/`:

1. **Especificação** — a API de integração com o WhatsApp foi desenhada e revisada antes de qualquer código (`docs/superpowers/specs/`)
2. **Plano** — o plano de implementação, incluindo o modelo de segurança e os casos de borda, ficou registrado antes da execução (`docs/superpowers/plans/`)
3. **Implementação** — código escrito contra a especificação, com as decisões de segurança revisadas manualmente

O resultado prático: do levantamento ao sistema em produção em poucos dias, substituindo um fornecedor pago.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis abaixo
npm run dev
```

| Variável | Onde usar | O que é |
|---|---|---|
| `VITE_SUPABASE_URL` | front + API | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | front + API | chave publicável (protegida por RLS) |
| `VITE_WHATSAPP_BUSINESS_NUMBER` | front | número do negócio, só dígitos |
| `WHATSAPP_TOKEN` | API | token permanente da Meta (System User) |
| `WHATSAPP_PHONE_NUMBER_ID` | API | ID do número no WhatsApp Manager |
| `WHATSAPP_VERIFY_TOKEN` | API | string de verificação do webhook |
| `WHATSAPP_APP_SECRET` | API | App Secret, usado na validação da assinatura |

As variáveis sem prefixo `VITE_` são lidas apenas no servidor e nunca chegam ao bundle. A configuração completa da Meta está em [`docs/whatsapp-setup.md`](docs/whatsapp-setup.md).

---

## Estrutura

```
api/                      funções serverless (Vercel)
  send-whatsapp.js        envio autenticado de mensagem
  whatsapp-webhook.js     recebimento com validação de assinatura
  _lib/                   montagem de payload e templates
src/
  pages/public/           reserva, fila e escolha de unidade
  pages/admin/            salões, regras, relatórios, usuários
  pages/                  painel de operação, clientes, autenticação
  lib/                    cliente Supabase, domínio e formatação
docs/                     especificação, plano e setup da Meta
```

---

## Autor

Matheus Lemos Dias — [LinkedIn](https://www.linkedin.com/in/matheuslemosdias)
