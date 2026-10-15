export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: AchievementCategory;
  xpReward: number;
}

export type AchievementCategory =
  | 'collection'
  | 'rarity'
  | 'social'
  | 'milestone'
  | 'streak';

export const ACHIEVEMENT_TEMPLATES: Record<string, Achievement> = {
  collector_100: {
    id: 'collector_100',
    name: 'Collector',
    description: 'Colete 100 cartas',
    icon: '🎴',
    requirement: 100,
    category: 'collection',
    xpReward: 500,
  },
  rarity_hunter: {
    id: 'rarity_hunter',
    name: 'Rarity Hunter',
    description: '50% das cartas são raras',
    icon: '💎',
    requirement: 50,
    category: 'rarity',
    xpReward: 750,
  },
  social_trader: {
    id: 'social_trader',
    name: 'Social Trader',
    description: 'Complete 50 trocas',
    icon: '🤝',
    requirement: 50,
    category: 'social',
    xpReward: 1000,
  },
  level_50: {
    id: 'level_50',
    name: 'Half Century',
    description: 'Atinja nível 50',
    icon: '🌟',
    requirement: 50,
    category: 'milestone',
    xpReward: 2000,
  },
  level_100: {
    id: 'level_100',
    name: 'Master Collector',
    description: 'Atinja nível 100',
    icon: '👑',
    requirement: 100,
    category: 'milestone',
    xpReward: 5000,
  },
};

export const LEVEL_MILESTONES = [10, 25, 50, 75, 100];
export const XP_PER_LEVEL_BASE = 1000;
export const XP_PER_LEVEL_MULTIPLIER = 1.1;

export function calculateNextLevelXp(level: number): number {
  return Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_PER_LEVEL_MULTIPLIER, level));
}
