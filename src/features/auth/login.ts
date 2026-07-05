import { findUserByCredentials } from '@/features/auth/users';
import type { AuthUser } from '@/features/auth/types';

export type LoginCredentials = {
  email: string;
  password: string;
};

export async function authenticateLogin(credentials: LoginCredentials): Promise<AuthUser> {
  const username = credentials.email.trim();
  const password = credentials.password.trim();

  if (!username || !password) {
    throw new Error('Credentials required');
  }

  const user = await findUserByCredentials(username, password);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  return user;
}
