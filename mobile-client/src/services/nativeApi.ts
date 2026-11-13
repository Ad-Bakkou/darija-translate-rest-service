import { fetch as expoFetch } from 'expo/fetch';
import { translate as coreTranslate, checkHealth as coreHealth } from './api';
import type { Account } from '../types/translation';
// SDK 58's Android Expo Fetch NativeRequest disables followRedirects for redirect:error.
// Use this transport rather than RN's legacy fetch, which cannot reliably reject redirects.
const transport = expoFetch as unknown as typeof fetch;
export const translate = (text: string, account: Account, options: { signal?: AbortSignal } = {}) =>
  coreTranslate(text, account, { ...options, fetchImpl: transport });
export const checkHealth = (options: { signal?: AbortSignal } = {}) => coreHealth({ ...options, fetchImpl: transport });
