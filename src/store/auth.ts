import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { isDemo, supabase } from '../lib/supabase'

export type AuthUser = { id: string; name: string; email: string }

export type SignUpResult = 'signed-in' | 'confirm-email'

type AuthState = {
  user: AuthUser | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  rename: (name: string) => Promise<void>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const validate = (email: string, password: string) => {
  if (!EMAIL_RE.test(email)) throw new Error('Digite um e-mail válido.')
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
}

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
  [/already registered|already been registered/i, 'Este e-mail já tem conta. Use a aba Entrar.'],
  [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/rate limit|too many requests|security purposes/i, 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
]

const translate = (message: string) => MESSAGES.find(([re]) => re.test(message))?.[1] ?? 'Não foi possível entrar. Tente de novo.'

const toUser = (u: User): AuthUser => {
  const email = u.email ?? ''
  const name =
    typeof u.user_metadata?.name === 'string' && u.user_metadata.name.trim() ? u.user_metadata.name.trim() : nameFromEmail(email)
  return { id: u.id, name, email }
}

function createDemoAuth() {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        ready: true,
        signIn: async (email, password) => {
          validate(email.trim(), password)
          await wait(700)
          set({ user: { id: 'demo', name: nameFromEmail(email.trim()), email: email.trim() } })
        },
        signUp: async (name, email, password) => {
          if (!name.trim()) throw new Error('Como podemos te chamar?')
          validate(email.trim(), password)
          await wait(900)
          set({ user: { id: 'demo', name: name.trim(), email: email.trim() } })
          return 'signed-in'
        },
        signOut: async () => set({ user: null }),
        rename: async (name) => set((s) => (s.user ? { user: { ...s.user, name } } : s)),
      }),
      { name: 'pokeflex-auth', partialize: (s) => ({ user: s.user }) },
    ),
  )
}

function createSupabaseAuth() {
  const client = supabase!
  const store = create<AuthState>()(() => ({
    user: null,
    ready: false,
    signIn: async (email, password) => {
      validate(email.trim(), password)
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(translate(error.message))
    },
    signUp: async (name, email, password) => {
      if (!name.trim()) throw new Error('Como podemos te chamar?')
      validate(email.trim(), password)
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
      })
      if (error) throw new Error(translate(error.message))
      // Com "Confirm email" ligado no Supabase, o cadastro não devolve sessão até o link ser clicado.
      return data.session ? 'signed-in' : 'confirm-email'
    },
    signOut: async () => {
      await client.auth.signOut()
    },
    rename: async (name) => {
      const { data, error } = await client.auth.updateUser({ data: { name } })
      if (error) throw new Error(translate(error.message))
      if (data.user) apply(data.user)
    },
  }))

  // Só troca o objeto quando o usuário muda de fato; renovações de token não devem disparar efeitos.
  const apply = (u: User | null) => {
    const next = u ? toUser(u) : null
    const prev = store.getState().user
    const same = prev?.id === next?.id && prev?.name === next?.name && prev?.email === next?.email
    store.setState(same ? { ready: true } : { user: next, ready: true })
  }
  client.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
  client.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null))
  return store
}

export const useAuth: UseBoundStore<StoreApi<AuthState>> = isDemo ? createDemoAuth() : createSupabaseAuth()
