import type { Account } from '../types/translation';
import { validateAccount } from '../utils/validation';
export const ACCOUNT_KEY = 'darija.translator.account.v1';
export type SecureStorage = { getItemAsync: (key: string) => Promise<string | null>; setItemAsync: (key: string, value: string) => Promise<void>; deleteItemAsync: (key: string) => Promise<void> };
// Serialize storage writes so Forget cannot race a previous Save.
export function accountStore(storage: SecureStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation); queue = result.catch(() => {}); return result;
  };
  return {
    load: () => serial(async (): Promise<Account | null> => {
      const raw = await storage.getItemAsync(ACCOUNT_KEY); if (!raw) return null;
      try { const value: unknown = JSON.parse(raw); validateAccount(value); return { username: value.username, password: value.password }; }
      catch { await storage.deleteItemAsync(ACCOUNT_KEY); return null; }
    }),
    save: (account: Account) => serial(async () => { validateAccount(account); await storage.setItemAsync(ACCOUNT_KEY, JSON.stringify(account)); }),
    forget: () => serial(() => storage.deleteItemAsync(ACCOUNT_KEY))
  };
}
