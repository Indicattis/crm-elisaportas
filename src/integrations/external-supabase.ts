import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://zddnvwqhfcqspmxscwyy.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZG52d3FoZmNxc3BteHNjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjgyMzcsImV4cCI6MjA2NzE0NDIzN30.-DllUGMpirnjRGchwGsc3w2dna8SqSbq-_fKFvXKOfs';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

export interface ExternalClient {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  estado: string | null;
  cidade: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  canal_aquisicao_id: string | null;
  observacoes: string | null;
  tipo_cliente: string | null;
  fidelizado: boolean;
  parceiro: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
