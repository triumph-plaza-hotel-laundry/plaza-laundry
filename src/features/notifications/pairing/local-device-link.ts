const STORAGE_KEY = 'tpl-employee-device-link-v1';

export type LocalDeviceLinkState = {
  linked: boolean;
  onesignalPlayerId: string;
  laundryEmployeeId: string | null;
  pairedAt: string | null;
};

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
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDeviceLink(state: LocalDeviceLinkState): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
