import { create } from 'zustand'
import { isDemo, supabase } from '../lib/supabase'
import { blobToDataUrl, squareWebp } from '../utils/image'
import { useAuth } from './auth'

type ProfileState = {
  avatarUrl: string | null
  load: (userId: string | null) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  rename: (name: string) => Promise<void>
}

const DEMO_KEY = 'pokeflex-avatar'

const offline = (message?: string) => !!message && /fetch|network/i.test(message)

export const useProfile = create<ProfileState>()((set, get) => ({
  avatarUrl: null,

  load: async (userId) => {
    if (isDemo) {
      try {
        return set({ avatarUrl: localStorage.getItem(DEMO_KEY) })
      } catch {
        return set({ avatarUrl: null })
      }
    }
    if (!userId) return set({ avatarUrl: null })
    const { data } = await supabase!.from('profiles').select('avatar_url').eq('id', userId).maybeSingle()
    set({ avatarUrl: (data as { avatar_url: string | null } | null)?.avatar_url ?? null })
  },

  uploadAvatar: async (file) => {
    const blob = await squareWebp(file)
    if (isDemo) {
      const url = await blobToDataUrl(blob)
      try {
        localStorage.setItem(DEMO_KEY, url)
      } catch {
        throw new Error('Não deu para salvar a foto neste navegador.')
      }
      return set({ avatarUrl: url })
    }
    const userId = useAuth.getState().user?.id
    if (!userId) throw new Error('Entre na sua conta para trocar a foto.')
    const path = `${userId}/avatar.webp`
    const { error } = await supabase!.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: 'image/webp',
      cacheControl: '3600',
    })
    if (error) throw new Error(offline(error.message) ? 'Sem conexão com o servidor.' : 'Não foi possível enviar a foto.')
    // O caminho é sempre o mesmo; o parâmetro de versão evita que o navegador mostre a foto antiga do cache.
    const url = `${supabase!.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
    const { error: saveError } = await supabase!.from('profiles').update({ avatar_url: url }).eq('id', userId)
    if (saveError) throw new Error('A foto subiu, mas não deu para salvar no perfil. Tente de novo.')
    set({ avatarUrl: url })
  },

  removeAvatar: async () => {
    const previous = get().avatarUrl
    set({ avatarUrl: null })
    if (isDemo) {
      try {
        localStorage.removeItem(DEMO_KEY)
      } catch {
        // Nada a limpar.
      }
      return
    }
    const userId = useAuth.getState().user?.id
    if (!userId) return
    const { error } = await supabase!.from('profiles').update({ avatar_url: null }).eq('id', userId)
    if (error) {
      set({ avatarUrl: previous })
      throw new Error('Não foi possível remover a foto.')
    }
    await supabase!.storage.from('avatars').remove([`${userId}/avatar.webp`])
  },

  rename: async (name) => {
    const clean = name.trim()
    if (!clean) throw new Error('O nome não pode ficar vazio.')
    if (clean.length > 40) throw new Error('Use até 40 caracteres.')
    await useAuth.getState().rename(clean)
    if (isDemo) return
    const userId = useAuth.getState().user?.id
    if (userId) await supabase!.from('profiles').update({ name: clean }).eq('id', userId)
  },
}))
