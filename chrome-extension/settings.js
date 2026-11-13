import { basicAuthorization } from './api.js';
export const CREDENTIAL_KEY = 'translatorCredentials';
export async function restrictStorage(storage = chrome.storage.session) {
  await storage.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
}
export async function getCredentials(storage = chrome.storage.session) {
  await restrictStorage(storage);
  return (await storage.get(CREDENTIAL_KEY))[CREDENTIAL_KEY] || null;
}
export async function saveCredentials(username, password, storage = chrome.storage.session, revision = crypto.randomUUID()) {
  basicAuthorization({ username, password });
  await restrictStorage(storage);
  await storage.set({ [CREDENTIAL_KEY]: { username, password, revision } });
}
export async function forgetCredentials(storage = chrome.storage.session) {
  await storage.remove(CREDENTIAL_KEY);
}
