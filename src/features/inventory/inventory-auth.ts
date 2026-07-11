const INVENTORY_SESSION_KEY = 'tpl-inventory-main-auth';

const INVENTORY_USERNAME = 'plaza';
const INVENTORY_PASSWORD = '123456';

export function isInventorySessionActive() {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  return sessionStorage.getItem(INVENTORY_SESSION_KEY) === 'authenticated';
}

export function startInventorySession() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(INVENTORY_SESSION_KEY, 'authenticated');
}

export function clearInventorySession() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(INVENTORY_SESSION_KEY);
}

export function validateInventoryCredentials(
  username: string,
  password: string,
) {
  return (
    username.trim() === INVENTORY_USERNAME && password === INVENTORY_PASSWORD
  );
}
