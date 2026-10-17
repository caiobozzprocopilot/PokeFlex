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

## Servidor (Vercel)

- `api/` são funções da Vercel; `server/` é o código comum delas (Supabase com chave secreta, envio de push).
- Agendamentos em `vercel.json`: lembrete do streak às 23h UTC (20h de Brasília) e preço-alvo às 12h UTC.
- Variáveis só da Vercel (nunca no git): `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`. Cópias locais em `.env.local`.
- A chave pública VAPID está no código (`src/services/push.ts` e `server/push.js`); se trocar o par, troque nos dois.
- Para testar push localmente: `vite build` + `vite preview` (o service worker não roda no `npm run dev`).

## Novidades (obrigatório a cada commit com mudança visível)

A tela "Novidades" (`src/pages/Updates.tsx`) é atualizada junto com cada commit que muda algo que o usuário vê:

- Adicione uma nova versão no **topo** de `RELEASES` em `src/data/updates.ts` (versão incrementada, data do dia, título e uma frase de resumo).
- Cada item: título curto, explicação amigável, uma **Dica** ensinando um detalhe que passa despercebido e, quando fizer sentido, uma ação (`page` ou `scan`).
- Print da tela em `public/updates/<nome>.webp`: 1280x800, tirado no modo demonstração (sem dados reais), WebP qualidade ~74.
- Correções invisíveis (refatoração, testes) não entram.

## Armadilhas

- Depois de mudar `tailwind.config.js` ou `.env.local`, reinicie o `npm run dev`; o Vite não recarrega sozinho aqui.
- No Windows, parar o `npm run dev` não mata o processo do Vite: confira se a porta 5173 ficou livre.
