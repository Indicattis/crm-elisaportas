## Objetivo

Hoje o `DealDialog` já mostra um alerta amarelo inline quando detecta telefone duplicado, mas o usuário consegue salvar mesmo assim sem nenhuma confirmação. Vamos transformar isso em um aviso bloqueante.

## Mudanças em `src/components/DealDialog.tsx`

1. **Revalidação no submit**
   - Antes de inserir/atualizar, rodar uma checagem síncrona em `deals` pelo telefone (mesma lógica de `checkDuplicatePhone`, com `>=4` dígitos e ignorando o próprio `deal.id` no modo edição). Isso evita escapar pela janela do debounce de 500ms.

2. **AlertDialog de confirmação**
   - Se houver duplicidade, abrir um `AlertDialog` (shadcn) com:
     - Título: "Telefone já cadastrado"
     - Mensagem: nome da negociação existente, etapa atual e responsável (`assignedName`).
     - Botões: **Cancelar** (fecha o aviso, mantém o formulário aberto) e **Cadastrar mesmo assim** (prossegue com o insert/update).
   - Só aplicar para criação e edição manual; o alerta inline amarelo continua visível enquanto o usuário digita.

3. **Estado novo**
   - `pendingDuplicate: { title, status, assignedName } | null` para controlar a abertura do `AlertDialog`.
   - Função `confirmAndSave()` que executa o `INSERT/UPDATE` após confirmação.

## Comportamento final

- Digitando telefone que já existe → alerta amarelo inline (já existe).
- Clicar em "Salvar" com duplicidade → abre `AlertDialog` perguntando se deseja prosseguir.
- "Cancelar" → volta ao formulário sem salvar.
- "Cadastrar mesmo assim" → salva normalmente.
- Sem duplicidade → fluxo atual inalterado.

## Fora do escopo

- Lead capture via edge function (`submit-lead`) — manter como está.
- Alterar regras de RLS ou schema.
