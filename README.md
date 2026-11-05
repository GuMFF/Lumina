# Lumina Studio — Sistema de Agendamento e Gestão para Salões de Beleza

O **Lumina Studio** é uma plataforma web moderna (SaaS) voltada para a gestão de salões de beleza, estúdios de estética e barbearias. O sistema oferece um **painel administrativo com controle de acesso por perfil (RBAC)**, **autenticação segura seguindo padrões OWASP** e uma **página pública de autoagendamento** intuitiva para os clientes.

---

## Histórico de Atualizações (Changelog)

### 04/11/2026 — Identidade Visual, Light/Dark Mode e Autenticação Segura (OWASP)
- **Nova Paleta de Cores:** Atualização visual completa combinando **Rose Terracota (`#BE185D`)**, **Dourado Âmbar (`#D97706`)** e **Areia Marfim / Café (`#FAF8F5` / `#1C1917`)**.
- **White & Dark Mode:** Adição do seletor de tema (`ThemeToggle`) em todas as páginas (Home, Painel Administrativo e Agendamento Público), além do atalho na tecla `D`.
- **Sistema Completo de Autenticação e Segurança (OWASP):**
  - **Cadastro e Validação (`Zod`):** Sanitização de inputs e política de senha forte (mínimo 8 caracteres, maiúscula, minúscula, número e símbolo), criando contas com `isVerified: false`.
  - **Verificação de Conta e Recuperação:** Código OTP de 6 dígitos e token de 15 minutos armazenados via hash SHA-256; redefinição de senha com invalidação imediata de todas as sessões ativas.
  - **Login e Sessão Segura:** Verificação de senha memory-hard (`scrypt`) em tempo constante contra enumeração de usuários, Access Token (15 min) + Refresh Token (7 dias) em cookies `HttpOnly; SameSite=Strict`, rotação automática de Refresh Token e detecção de reuso.
  - **Camada de Proteção:** Rate Limiting por IP/conta, Account Lockout progressivo após 5 falhas, proteção CSRF Double-Submit + headers de segurança em `src/proxy.ts`, suporte a 2FA (TOTP RFC 6238 com QR Code) e Logs de Auditoria em `/dashboard/seguranca`.

### 01/11/2026 — Lançamento Inicial & Integração Supabase
- Estruturação do painel administrativo (`/dashboard/agenda`, `/dashboard/servicos`, `/dashboard/equipe`, `/dashboard/divulgacao`) e página pública (`/agendar/[slug]`) integrados ao banco PostgreSQL no Supabase.

---

## Funcionalidades Principais

- **Painel de Agenda (`/dashboard/agenda`):** Visualização dos agendamentos agrupados por data, com filtros por status (*Confirmado*, *Concluído*, *Cancelado*) e escopo por perfil (*Admin* visualiza toda a equipe; *Staff* visualiza sua própria agenda).
- **Catálogo de Serviços (`/dashboard/servicos`):** Cadastro e exclusão de serviços com título, descrição, preço em reais (BRL) e tempo de duração em minutos.
- **Gestão de Equipe e Jornada (`/dashboard/equipe`):** Configuração individual dos dias e horários de expediente e intervalo de pausa de cada profissional.
- **Divulgação & QR Code (`/dashboard/divulgacao`):** Geração automática do link público exclusivo do salão e QR Code pronto para impressão ou compartilhamento nas redes sociais.
- **Central de Segurança & Auth (`/dashboard/seguranca` e `/login`):** Gestão de sessão, ativação de 2FA (TOTP), rotação de tokens e visualização de logs de auditoria.
- **Página Pública de Agendamento (`/agendar/[slug]`):** Fluxo passo a passo (*Wizard*) para o cliente escolher o serviço, o profissional (ou qualquer disponível), a data e o horário livre calculado automaticamente sem conflitos de agenda.

---

## Tecnologias Utilizadas

### Frontend & Framework
- **[Next.js 16](https://nextjs.org/)** (App Router, Server & Client Components, Proxy de Segurança, Turbopack)
- **[React 19](https://react.dev/)** & **[TypeScript 5](https://www.typescriptlang.org/)**
- **[Zod](https://zod.dev/)** (Validação e sanitização de schemas no front-end e back-end)

### Estilização & UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** (Paleta Rose Terracota, Âmbar e Stone com suporte completo a White & Dark Mode via `next-themes`)
- **[shadcn/ui](https://ui.shadcn.com/)** & **[@base-ui/react](https://base-ui.com/)**
- **[Lucide React](https://lucide.dev/)** & **[qrcode.react](https://github.com/zpao/qrcode.react)**

### Backend, Segurança & Banco de Dados
- **[Supabase](https://supabase.com/)** (`@supabase/supabase-js` & `@supabase/ssr`)
- **Node.js Crypto (`scrypt`, `HMAC-SHA256`, `AES-256-GCM`, `timingSafeEqual`)**
- **PostgreSQL** com **Row-Level Security (RLS)** (`salons`, `profiles`, `services`, `working_hours`, `appointments`, `auth_users`, `auth_sessions`, `auth_verification_tokens`, `auth_rate_limits`, `auth_audit_logs`).

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
   - Login / Cadastro: `http://localhost:3000/login`
   - Painel administrativo: `http://localhost:3000/dashboard/agenda`
   - Página pública do cliente: `http://localhost:3000/agendar/lumina`
