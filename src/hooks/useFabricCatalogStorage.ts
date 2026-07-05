import { useCallback, useSyncExternalStore } from 'react';

const FAVORITES_KEY = 'tpl-fabric-favorites';
const RECENT_KEY = 'tpl-fabric-recent';
const MAX_RECENT = 8;

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function writeRecent(ids: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
}

let favoritesSnapshot = readFavorites();
let recentSnapshot = readRecent();
const favoritesListeners = new Set<() => void>();
const recentListeners = new Set<() => void>();

function emitFavorites() {
  favoritesListeners.forEach((listener) => listener());
}

function emitRecent() {
  recentListeners.forEach((listener) => listener());
}

function subscribeFavorites(listener: () => void) {
  favoritesListeners.add(listener);
  return () => favoritesListeners.delete(listener);
}

function subscribeRecent(listener: () => void) {
  recentListeners.add(listener);
  return () => recentListeners.delete(listener);
}

export function useFabricFavorites() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    () => favoritesSnapshot,
    () => favoritesSnapshot,
  );

  const toggleFavorite = useCallback((fabricId: string) => {
    const next = favoritesSnapshot.includes(fabricId)
      ? favoritesSnapshot.filter((id) => id !== fabricId)
      : [...favoritesSnapshot, fabricId];
    favoritesSnapshot = next;
    writeFavorites(next);
    emitFavorites();
  }, []);

  const isFavorite = useCallback(
    (fabricId: string) => favoritesSnapshot.includes(fabricId),
    [],
  );

  return { favorites, toggleFavorite, isFavorite };
}

export function useRecentlyViewedFabrics() {
  const recentIds = useSyncExternalStore(subscribeRecent, () => recentSnapshot, () => recentSnapshot);

  const trackView = useCallback((fabricId: string) => {
    const next = [fabricId, ...recentSnapshot.filter((id) => id !== fabricId)].slice(0, MAX_RECENT);
    recentSnapshot = next;
    writeRecent(next);
    emitRecent();
  }, []);

  return { recentIds, trackView };
}
