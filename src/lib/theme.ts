import type { Theme } from '@/types/theme';

const themeStorageKey = 'tpl-theme';
const defaultTheme: Theme = 'dark';

const themeColors: Record<Theme, string> = {
  dark: '#050505',
  'luxury-light': '#d9d0c3',
};

type ThemeListener = () => void;
const listeners = new Set<ThemeListener>();

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'luxury-light';
}

function readStoredTheme(): Theme {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return isTheme(storedTheme) ? storedTheme : defaultTheme;
}

function updateThemeColor(theme: Theme) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme]);
}

function notifyThemeListeners() {
  listeners.forEach((listener) => listener());
}

function beginThemeSwitch() {
  document.documentElement.classList.add('theme-switching');
}

function endThemeSwitch() {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-switching');
  });
}

function commitTheme(theme: Theme, persist: boolean) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  root.style.backgroundColor = themeColors[theme];
  updateThemeColor(theme);

  if (persist) {
    window.localStorage.setItem(themeStorageKey, theme);
  }

  void root.offsetHeight;
  notifyThemeListeners();
}

export function subscribeToTheme(listener: ThemeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTheme(): Theme {
  const currentTheme = document.documentElement.dataset.theme;
  return isTheme(currentTheme) ? currentTheme : readStoredTheme();
}

export function getServerThemeSnapshot(): Theme {
  return defaultTheme;
}

export function applyTheme(theme: Theme, options?: { persist?: boolean }) {
  beginThemeSwitch();
  commitTheme(theme, options?.persist ?? true);
  endThemeSwitch();
}

export function setTheme(theme: Theme) {
  applyTheme(theme, { persist: true });
}

export function toggleTheme() {
  beginThemeSwitch();
  commitTheme(getTheme() === 'dark' ? 'luxury-light' : 'dark', true);
  endThemeSwitch();
}

export function initTheme() {
  commitTheme(readStoredTheme(), false);
}
