export interface BeliefSystem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  themeColor: string;
  particleColor: string;
  backgroundGradient: [string, string];
}

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

export type Screen = 'welcome' | 'belief-selector' | 'conversation';
