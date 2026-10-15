# 🎮 PokeFlex - Coleção Pokémon Gamificada

Ambiente interativo e gamificado para colação de cartas Pokémon oficiais com animações holográficas e sistema de progressão.

## 📋 Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Firebase** - Backend (Auth, Firestore, Storage)
- **Zustand** - State management
- **Framer Motion** - Animações
- **React Bits (HoloCard)** - Cartas holográficas
- **tcgDex API** - Dados de cartas oficiais

## 🚀 Getting Started

### Instalação

```bash
npm install
```

### Development

```bash
npm run dev
```

Abre http://localhost:5173

### Build

```bash
npm run build
```

## 📁 Estrutura do Projeto

```
pokeflex/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes base (Button, Card, Modal)
│   │   ├── pokemon/         # Componentes específicos de cartas
│   │   ├── collection/      # Gerenciamento de coleção
│   │   ├── gamification/    # Sistema de pontos e badges
│   │   ├── trade/           # Trading entre usuários
│   │   ├── profile/         # Perfil do usuário
│   │   └── layout/          # Header, Sidebar, Footer
│   │
│   ├── pages/               # Páginas/Rotas principais
│   ├── services/            # Integração Firebase, tcgDex, Auth
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript types e interfaces
│   ├── utils/               # Funções utilitárias
│   ├── styles/              # CSS globals e temas
│   └── main.tsx
│
├── public/                  # Assets estáticos
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 🎨 Design System

### Cores
- **Primary**: #FFD60A (Amarelo - Energia)
- **Secondary**: #0051BA (Azul - Confiança)
- **Accent**: #FF006E (Rosa - Achievements)
- **Dark**: #1A1A2E (Fundo)

### Tipografia
- **Display**: Poppins (Bold, títulos)
- **Body**: Inter (Regular, conteúdo)
- **Monospace**: IBM Plex Mono (Dados)

## 🃏 HoloCard Integration

As cartas usam o componente `HoloCard` do React Bits para efeitos holográficos.

### Presets Disponíveis
- `bursts` - Anéis de foil
- `stars` - Estrelas
- `shards` - Gelo rachado
- `cosmos` - Cósmico
- `rainbow` - Arco-íris
- `swirl` - Redemoinho
- `glitter` - Brilho
- `gold` - Ouro (legendárias)

```tsx
import HoloCard from './HoloCard';

<HoloCard 
  image={cardImageUrl}
  backImage={cardBackUrl}
  preset="bursts"
  intensity={0.85}
/>
```

## 🎮 Gamificação

### Sistema de Progresso
- **Levels**: 1-100
- **XP Points**: Ganho por ações
- **Badges**: 20+ achievements desbloqueáveis
- **Streaks**: Bônus por dias consecutivos

### Ações que Geram XP
- Adicionar carta à coleção: +10 XP
- Completar série: +500 XP
- Realizar troca: +50 XP

## 📱 Mobile-First

Design responsivo com breakpoints:
- `xs`: 320px (Mobile)
- `md`: 768px (Tablet)
- `lg`: 1024px+ (Desktop)

## 🔧 Desenvolvimento

### Type Checking
```bash
npm run type-check
```

### Adicionar Novo Componente

1. Crie o arquivo em `src/components/{categoria}/`
2. Exporte em `src/components/index.ts`
3. Use com type-safety

### Variáveis CSS

```css
--primary: #FFD60A;
--spacing-lg: 16px;
--duration-base: 200ms;
```

## 📚 Próximas Etapas (Fase 2)

- [ ] Dark mode
- [ ] Sistema de marketplace
- [ ] Recomendações IA
- [ ] Social features (chat, friends)
- [ ] Mobile app (React Native)

## 📖 Documentação

Ver [Design System](./DESIGN_SYSTEM.md) para mais detalhes sobre componentes e animações.

## 📄 Licença

MIT

---

**Status**: Em desenvolvimento 🚀
