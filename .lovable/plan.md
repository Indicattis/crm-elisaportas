

# Canais de Aquisição Configuráveis com Ícones

## Visão geral

Criar uma nova tabela `acquisition_channels` para armazenar os canais de aquisição de forma dinâmica (em vez de hardcoded no código). Adicionar um novo card "Canais de Aquisição" no hub de configuração do CRM, com uma seção dedicada para CRUD dos canais. Cada canal terá um nome e um ícone selecionável de um pacote pré-definido (Google, Facebook, Instagram, TikTok, Indicação, etc).

## 1. Migração — Nova tabela `acquisition_channels`

```sql
CREATE TABLE public.acquisition_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'megaphone',
  position integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo, membros podem visualizar
CREATE POLICY "Admins can manage channels" ON public.acquisition_channels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view channels" ON public.acquisition_channels
  FOR SELECT TO authenticated
  USING (true);

-- Inserir canais padrão (serão vinculados ao primeiro admin que acessar)
```

## 2. Novo componente `AcquisitionChannelManager`

- Lista os canais com nome + ícone
- Botão para adicionar novo canal (modal com campo nome + seletor de ícone)
- Editar/excluir canais existentes
- Reordenar por drag ou posição

### Pacote de ícones pré-definidos

Mapa de ícones SVG customizados para redes sociais (não disponíveis no Lucide):
- Google, Facebook, Instagram, TikTok, WhatsApp, LinkedIn, YouTube, Twitter/X
- Ícones genéricos do Lucide: Megaphone (indicação), UserCheck (cliente fidelizado), Shield (autorizado), Globe (site), Mail (email), Phone (telefone)

O seletor mostrará uma grid de ícones clicáveis.

## 3. Atualizar `CrmConfig.tsx`

- Adicionar `"channels"` ao type de `activeSection`
- Novo card com ícone `Megaphone` e título "Canais de Aquisição"
- Nova seção renderizando `<AcquisitionChannelManager />`

## 4. Atualizar `DealDialog.tsx`

- Substituir a lista hardcoded de canais por um fetch da tabela `acquisition_channels`
- Exibir o ícone do canal ao lado do nome no Select

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Nova tabela `acquisition_channels` com RLS |
| `src/components/AcquisitionChannelManager.tsx` | Novo componente de gestão de canais |
| `src/components/ChannelIconPicker.tsx` | Novo componente seletor de ícones |
| `src/lib/channel-icons.tsx` | Mapa de ícones SVG para redes sociais |
| `src/pages/CrmConfig.tsx` | Novo card e seção "Canais de Aquisição" |
| `src/components/DealDialog.tsx` | Buscar canais do banco em vez de lista hardcoded |

