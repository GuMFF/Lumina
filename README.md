# Lumina Studio — Sistema de Agendamento e Gestão para Salões de Beleza

O **Lumina Studio** é uma plataforma web moderna (SaaS) voltada para a gestão de salões de beleza, estúdios de estética e barbearias. O sistema oferece um **painel administrativo com controle de acesso por perfil (RBAC)** para gerenciamento da operação diária e uma **página pública de autoagendamento** intuitiva para os clientes.

---

## Funcionalidades Principais

- **Painel de Agenda (`/dashboard/agenda`):** Visualização dos agendamentos agrupados por data, com filtros por status (*Confirmado*, *Concluído*, *Cancelado*) e escopo por perfil (*Admin* visualiza toda a equipe; *Staff* visualiza sua própria agenda).
- **Catálogo de Serviços (`/dashboard/servicos`):** Cadastro e exclusão de serviços com título, descrição, preço em reais (BRL) e tempo de duração em minutos.
- **Gestão de Equipe e Jornada (`/dashboard/equipe`):** Configuração individual dos dias e horários de expediente e intervalo de pausa de cada profissional.
- **Divulgação & QR Code (`/dashboard/divulgacao`):** Geração automática do link público exclusivo do salão e QR Code pronto para impressão ou compartilhamento nas redes sociais.
- **Página Pública de Agendamento (`/agendar/[slug]`):** Fluxo passo a passo (*Wizard*) para o cliente escolher o serviço, o profissional (ou qualquer disponível), a data e o horário livre calculado automaticamente sem conflitos de agenda.
- **Controle de Acesso (RBAC):** Alternância e proteção de rotas entre os perfis `ADMIN` (acesso completo ao salão) e `STAFF` (acesso focado na agenda).

---

## Tecnologias Utilizadas

### Frontend & Framework
- **[Next.js 16](https://nextjs.org/)** (App Router, Server & Client Components, Turbopack)
- **[React 19](https://react.dev/)**
- **[TypeScript 5](https://www.typescriptlang.org/)** (Tipagem estática de ponta a ponta)

### Estilização & UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** (Estilização utilitária responsiva com suporte a Dark Mode via `next-themes`)
- **[shadcn/ui](https://ui.shadcn.com/)** & **[@base-ui/react](https://base-ui.com/)** (Componentes acessíveis e modulares)
- **[Lucide React](https://lucide.dev/)** (Ícones consistentes para a interface)
- **[qrcode.react](https://github.com/zpao/qrcode.react)** (Renderização de QR Code em SVG para divulgação do link do salão)

### Backend & Banco de Dados
- **[Supabase](https://supabase.com/)** (`@supabase/supabase-js` & `@supabase/ssr`)
- **PostgreSQL** com **Row-Level Security (RLS)** para proteção das tabelas:
  - `salons`: Dados cadastrais e `slug` público do salão.
  - `profiles`: Perfis de usuários (`ADMIN` e `STAFF`) vinculados ao Supabase Auth.
  - `services`: Catálogo de serviços, preços e durações.
  - `working_hours`: Grade semanal de horários e pausas por profissional.
  - `appointments`: Registro de agendamentos e status de atendimento.

---

## Estrutura do Projeto

```text
src/
├── app/
│   ├── (dashboard)/dashboard/
│   │   ├── agenda/       # Visualização e filtro de agendamentos
│   │   ├── servicos/     # CRUD do catálogo de serviços
│   │   ├── equipe/       # Gestão de horários dos profissionais
│   │   └── divulgacao/   # Link público e gerador de QR Code
│   └── agendar/[slug]/   # Fluxo público de agendamento para clientes
├── components/
│   ├── booking/          # BookingWizard (passo a passo do cliente)
│   ├── dashboard/        # Views administrativas, Sidebar e DashboardShell
│   └── ui/               # Componentes base da interface
├── lib/
│   ├── supabase/         # Clientes browser/server e queries do Supabase
│   ├── booking-logic.ts  # Cálculo inteligente de horários livres e conflitos
│   ├── format.ts         # Formatação de moeda (BRL), datas e horários
│   └── mock-data.ts      # Dados de fallback para demonstração offline
└── types/
    └── index.ts          # Interfaces TypeScript do domínio
```

---

## Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env.local` (ou `.env`) e preencha com as credenciais do seu projeto no Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   - Página inicial: `http://localhost:3000`
   - Painel administrativo: `http://localhost:3000/dashboard/agenda`
   - Página pública do cliente: `http://localhost:3000/agendar/lumina`
