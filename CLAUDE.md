# PokeFlex - Claude Code Configuration

## Idioma

Sempre responder em português.

## Permissões

As permissões ficam em `.claude/settings.json` (não aqui; este arquivo não libera nada). Estão liberados sem confirmação: comandos Bash e PowerShell, ler, editar e criar arquivos, busca e consulta à web. Continuam bloqueados: apagar pastas recursivamente e `git push --force`.

## Referência Rápida

- **Dev server**: `npm run dev` (Vite na porta 5173)
- **Build**: `npm run build`
- **Type check**: `npm run type-check`

## Stack

- React 18 + TypeScript
- Vite 5
- Supabase (Postgres + Auth) — cliente em `src/lib/supabase.ts`, schema em `supabase/migrations/`
- Deploy: Vercel
- Tailwind CSS
- Zustand
- tcgDex API (cartas, sets e preços Cardmarket/TCGplayer) + Frankfurter (câmbio para BRL)

## Estrutura

```
src/
├── components/
├── pages/
├── services/
├── hooks/
├── store/
├── types/
├── utils/
└── styles/
```

## Supabase

- Variáveis em `.env.local` (veja `.env.example`). Sem elas o app roda em modo demonstração (login e coleção no navegador).
- Mudanças no banco: novo arquivo em `supabase/migrations/` e rodar no SQL Editor do projeto.

## Armadilhas

- Depois de mudar `tailwind.config.js` ou `.env.local`, reinicie o `npm run dev`; o Vite não recarrega sozinho aqui.
- No Windows, parar o `npm run dev` não mata o processo do Vite: confira se a porta 5173 ficou livre.
