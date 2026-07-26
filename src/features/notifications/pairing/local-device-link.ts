import { resolvePermanentEmployeeId } from '@/lib/employee-permanent-id';

const STORAGE_KEY = 'tpl-employee-device-link-v1';

export type LocalDeviceLinkState = {
  linked: boolean;
  onesignalPlayerId: string;
  laundryEmployeeId: string | null;
  pairedAt: string | null;
};

function withRemappedEmployeeId(
  parsed: LocalDeviceLinkState,
): LocalDeviceLinkState {
  if (!parsed.laundryEmployeeId) {
    return parsed;
  }
  const nextId = resolvePermanentEmployeeId(parsed.laundryEmployeeId);
  if (nextId === parsed.laundryEmployeeId) {
    return parsed;
  }
  return { ...parsed, laundryEmployeeId: nextId };
}

export function readLocalDeviceLink(): LocalDeviceLinkState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LocalDeviceLinkState;
    if (!parsed || typeof parsed.linked !== 'boolean') {
      return null;
    }
    const remapped = withRemappedEmployeeId(parsed);
    if (remapped.laundryEmployeeId !== parsed.laundryEmployeeId) {
      // Persist remap so pairing / inbox keep using Employee ID.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remapped));
    }
    return remapped;
  } catch {
    return null;
  }
}

export function writeLocalDeviceLink(state: LocalDeviceLinkState): void {
  if (typeof window === 'undefined') {
    return;
  }
  const remapped = withRemappedEmployeeId(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remapped));
  window.dispatchEvent(new Event('tpl-device-link-changed'));
}

export function clearLocalDeviceLink(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('tpl-device-link-changed'));
}

export function subscribeLocalDeviceLink(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => onChange();
  window.addEventListener('storage', handler);
  window.addEventListener('tpl-device-link-changed', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('tpl-device-link-changed', handler);
  };
}
