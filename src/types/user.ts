export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
  level: number;
  xp: number;
  badges: Badge[];
  preferences: UserPreferences;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  category: 'collection' | 'gamification' | 'social' | 'milestone';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  privateProfile: boolean;
}

export interface UserStats {
  level: number;
  xp: number;
  nextLevelXp: number;
  totalCardsCollected: number;
  tradesCompleted: number;
  badgesUnlocked: number;
  streak: number;
  joinedDaysAgo: number;
}
