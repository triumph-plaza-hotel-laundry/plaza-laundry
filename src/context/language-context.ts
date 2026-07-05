import { createContext } from 'react';
import type { Direction, Language, TranslationKey } from '@/types/language';

export type LanguageContextValue = {
  language: Language;
  direction: Direction;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
