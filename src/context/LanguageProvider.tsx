import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  defaultLanguage,
  dictionaries,
  languageDirections,
} from '@/i18n/dictionaries';
import { LanguageContext } from '@/context/language-context';
import type { Language, TranslationKey } from '@/types/language';

const languageStorageKey = 'tpl-language';

type LanguageProviderProps = {
  children: ReactNode;
};

function getInitialLanguage(): Language {
  const storedLanguage = window.localStorage.getItem(languageStorageKey);

  if (storedLanguage === 'ar' || storedLanguage === 'en') {
    return storedLanguage;
  }

  return defaultLanguage;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const direction = languageDirections[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    window.localStorage.setItem(languageStorageKey, language);
  }, [direction, language]);

  const value = useMemo(
    () => ({
      language,
      direction,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'ar' : 'en')),
      t: (key: TranslationKey) => dictionaries[language][key],
    }),
    [direction, language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
