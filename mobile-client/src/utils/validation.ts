import type { Account } from '../types/translation';
export class ClientError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'ClientError'; }
}
export const codePoints = (value: string) => [...value].length;
export function validUnicode(value: string): boolean {
  // Reject unpaired UTF-16 surrogates without depending on String.isWellFormed.
  return ![...value].some(c => c.length === 1 && c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff);
}
export function validateText(text: unknown): asserts text is string {
  if (typeof text !== 'string' || !text.trim()) throw new ClientError('INPUT', 'Enter some English text first.');
  if (!validUnicode(text)) throw new ClientError('INPUT', 'Text contains invalid Unicode. Please paste it again.');
  if (codePoints(text) > 5000) throw new ClientError('INPUT', 'Keep the text within 5,000 Unicode characters.');
}
export function validateAccount(account: unknown): asserts account is Account {
  const a = account as Account | null;
  if (!a || typeof a.username !== 'string' || typeof a.password !== 'string' || !a.username.trim() || !a.password.trim())
    throw new ClientError('ACCOUNT', 'Add your translator username and password in Settings.');
  if (a.username.includes(':') || !validUnicode(a.username + a.password))
    throw new ClientError('ACCOUNT', 'Use a username without a colon and valid Unicode credentials.');
}
export function basicAuthorization(account: Account): string {
  validateAccount(account);
  const bytes = new TextEncoder().encode(account.username + ':' + account.password);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const bits = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    encoded += alphabet[(bits >>> 18) & 63] + alphabet[(bits >>> 12) & 63]
      + (i + 1 < bytes.length ? alphabet[(bits >>> 6) & 63] : '=')
      + (i + 2 < bytes.length ? alphabet[bits & 63] : '=');
  }
  return 'Basic ' + encoded;
}
