import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chave "publishable" (formato novo) ou "anon" (formato antigo); ambas são públicas, quem protege os dados é o RLS.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem as variáveis o app roda em modo demonstração (login e coleção só no navegador).
export const supabase = url && key ? createClient(url, key) : null

export const isDemo = supabase === null

if (isDemo && import.meta.env.DEV) {
  console.info('[PokeFlex] Supabase não configurado: rodando em modo demonstração. Veja .env.example.')
}
