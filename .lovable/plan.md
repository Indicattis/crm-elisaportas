

# CRM Elisa Portas de Enrolar

## Overview
Build a web CRM with futuristic glassmorphism theme (white background, blue primary), featuring a Kanban board for deal management and email/password authentication.

## Design System
- Background: white
- Primary: blue (matching the logo)
- Glassmorphism: translucent cards with backdrop-blur, subtle borders, soft shadows
- Font: clean, modern (Inter or system)
- Logo: uploaded brand logo in header

## Kanban Columns (10)
1. Lead
2. Fazer orçamento
3. Orçamento enviado
4. Propenso a fechar
5. Aguardando obra
6. Sem interesse
7. Excluído (Perda de tempo)
8. Visitas
9. Pedidos a lançar
10. Cliente fechado

## Authentication
- Single user, email/password login via Supabase Auth
- Login page with glassmorphism card
- Protected routes redirecting to login

## Database (Supabase)
- **clients** table: id, name, email, phone, created_at, user_id
- **deals** table: id, client_id (FK), title, value, status (kanban column), notes, created_at, updated_at, user_id
- RLS policies scoped to authenticated user

## Pages & Components

### 1. Login Page (`/login`)
- Glassmorphism card with logo, email/password fields, sign-in button

### 2. Dashboard / Kanban (`/`)
- Header with logo, user menu, logout
- Horizontal scrollable Kanban board with 10 columns
- Deal cards showing client name, title, value
- Drag-and-drop between columns (using @dnd-kit)
- "Add deal" button per column opening a dialog

### 3. Deal Dialog
- Form to create/edit a deal: select client, title, value, notes
- Option to create new client inline

### 4. Clients Page (`/clients`)
- Table listing all clients (name, email, phone)
- Add/edit client dialog

## Technical Approach

### Files to create/modify:
- `src/index.css` - Update CSS variables for blue theme + glassmorphism utilities
- `src/integrations/supabase/` - Supabase client setup
- `src/pages/Login.tsx` - Auth page
- `src/pages/Index.tsx` - Kanban board (main page)
- `src/pages/Clients.tsx` - Client list
- `src/components/KanbanBoard.tsx` - Board with columns
- `src/components/KanbanColumn.tsx` - Single column
- `src/components/DealCard.tsx` - Deal card with glassmorphism
- `src/components/DealDialog.tsx` - Create/edit deal
- `src/components/ClientDialog.tsx` - Create/edit client
- `src/components/Header.tsx` - App header with logo
- `src/components/AuthGuard.tsx` - Route protection
- `src/App.tsx` - Add routes
- Supabase migrations for tables + RLS

### Dependencies to add:
- `@dnd-kit/core`, `@dnd-kit/sortable` for drag-and-drop

## Sequence
1. Set up Supabase (Cloud) with tables + auth
2. Update theme (blue primary, glassmorphism styles)
3. Build auth flow (login page + guard)
4. Build Kanban board with columns and deal cards
5. Build client management page
6. Add drag-and-drop functionality

