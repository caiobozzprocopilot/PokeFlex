# 🃏 HoloCard Setup Guide

## Integração do React Bits HoloCard no PokeFlex

O `HoloCard` fornece animações WebGL profissionais com efeito holográfico para cartas Pokémon.

### Instalação

O HoloCard é um componente independente. Copie os arquivos para o projeto:

```bash
# 1. Copie o componente
cp /path/to/HoloCard.tsx src/components/pokemon/
cp /path/to/HoloCard.css src/components/pokemon/

# 2. Ou instale via npm (quando publicado)
npm install react-bits-holocard
```

### Arquivos Necessários

- `src/components/pokemon/HoloCard.tsx` - Componente React
- `src/components/pokemon/HoloCard.css` - Estilos e animações WebGL

### Uso Básico

```tsx
import HoloCard from '@components/pokemon/HoloCard'

<HoloCard 
  image={card.imageUrl}
  alt={card.name}
  preset="bursts"
/>
```

### Com Flip (Frente/Verso)

```tsx
<HoloCard 
  image={card.imageUrl}
  backImage={card.backImageUrl}
  alt={card.name}
  preset="stars"
/>
```

### Props Principais

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `image` | string | - | URL da imagem frontal |
| `backImage` | string | - | URL da imagem traseira (habilita flip) |
| `preset` | string | 'bursts' | Efeito holofoil |
| `intensity` | number | 0.85 | Força do efeito (0-1) |
| `scale` | number | 1 | Tamanho do padrão holofoil |
| `width` | number | 320 | Largura em px |
| `tiltMax` | number | 14 | Ângulo máximo de tilt |
| `hoverScale` | number | 1.04 | Escala ao hover |
| `idle` | boolean | true | Shimmer quando parado |
| `preset` | string | 'bursts' | Tipo de holofoil |

### Presets de Holofoil

Cada rarity pode usar um preset diferente:

```tsx
const PRESET_BY_RARITY = {
  common: 'glitter',
  uncommon: 'stars',
  rare: 'bursts',
  holo_rare: 'cosmos',
  ex: 'gold',
  v: 'rainbow',
  vmax: 'swirl',
  vstar: 'shards',
}
```

### Cores Personalizadas

```tsx
<HoloCard 
  image={card.imageUrl}
  preset="gold"
  foilColor="#FFD700" // Ouro
  intensity={0.9}
/>
```

### Performance

- HoloCard usa WebGL (GPU acceleration)
- Respeita `prefers-reduced-motion` para acessibilidade
- Lazy loads quando visível (IntersectionObserver)
- Suporta touch em mobile

### Modo Mobile

Em dispositivos móveis:
- Touch tracking substitui mouse hover
- Desabilita idle motion se conexão lenta
- Responde a gestos (tap para flip)

```tsx
// Automaticamente responsivo
<HoloCard 
  image={card.imageUrl}
  width={window.innerWidth < 768 ? 240 : 320}
/>
```

### Otimização de Imagens

As imagens devem ser:
- Formato: WebP ou PNG (JPEG com falha em transparência)
- Tamanho: ~150-250KB
- Dimensão: 160x240px (proporcional card real) ou maior
- CORS enabled se de CDN externo

```tsx
<HoloCard 
  image="https://cdn.example.com/card.webp?w=320&q=85"
/>
```

### Acessibilidade

```tsx
<HoloCard 
  image={card.imageUrl}
  alt={`Carta: ${card.name} - ${card.rarity}`}
  backImage={card.backImageUrl}
/>
```

- Respeita `aria-label` via prop `alt`
- Suporta keyboard (Enter/Space para flip)
- Compatível com screen readers

### Troubleshooting

**Problema**: Holofoil não aparece
- Verifique se o Canvas está renderizando (check DevTools)
- Confirme CORS da imagem
- Teste com `intensity={1}` para máxima visibilidade

**Problema**: Performance ruim no mobile
- Reduza `scale` (padrão mais esparso)
- Desabilite `idle={false}`
- Reduza `width` para dispositivos pequenos

**Problema**: Flip lento
- Normal (animação em 180ms)
- Verifique se WebGL está acelerado

### Exemplos de Grid

```tsx
// Grid responsivo 2-5 colunas
const cardWidth = {
  xs: '100%',    // Mobile: 2 cols (w-1/2)
  sm: 'calc(50% - 8px)',  // 2 cols
  md: 'calc(33.33% - 8px)', // 3 cols
  lg: 'calc(25% - 8px)',  // 4 cols
  xl: 'calc(20% - 8px)',  // 5 cols
}
```

### Integração com State

```tsx
import { useCollection } from '@hooks/useCollection'

function CardGrid() {
  const { collection } = useCollection()
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {collection.map(cardData => (
        <HoloCard 
          key={cardData.cardId}
          image={cardData.image}
          preset={PRESET_BY_RARITY[cardData.rarity]}
        />
      ))}
    </div>
  )
}
```

### Próximos Passos

1. ✅ Copiar HoloCard para `src/components/pokemon/`
2. ⏭️ Criar componente `PokemonCard` que wraps HoloCard
3. ⏭️ Implementar grid responsivo
4. ⏭️ Integrar com state de coleção
5. ⏭️ Adicionar animações de entrada/saída

---

**Nota**: HoloCard é o componente de apresentação. Para lógica de colação, use `useCollection()` hook.
