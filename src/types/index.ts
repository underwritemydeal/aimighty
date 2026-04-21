export interface BeliefSystem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  themeColor: string;
  particleColor: string;
  backgroundGradient: [string, string];
  category?: 'religious' | 'spiritual' | 'philosophical';
}

export type Tier = 'free' | 'believer' | 'divine';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  isSpeaking: boolean;
  isListening: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: number;
  emailVerified: boolean;
  messageCount: number;
  isPremium: boolean;
  tier?: Tier;
}

export type Screen =
  | 'loading'
  | 'landing'
  | 'article'
  | 'welcome'
  | 'auth'
  | 'belief-selector'
  | 'belief-welcome'
  | 'conversation'
  | 'other-beliefs-confirm'
  | 'other-beliefs-picker'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'paywall';

export type AuthMode = 'login' | 'signup' | 'verify-email';
