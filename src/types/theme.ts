export const themes = ['dark', 'luxury-light'] as const;

export type Theme = (typeof themes)[number];

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};
