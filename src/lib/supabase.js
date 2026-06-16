import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] ERRO: variáveis de ambiente não carregadas!', { supabaseUrl, supabaseAnonKey });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
