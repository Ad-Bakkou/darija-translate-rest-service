import { BASE_URL, REQUEST_TIMEOUT } from '../config/environment';
import type { Account, Translation } from '../types/translation';
import { basicAuthorization, ClientError, validateText, validUnicode } from '../utils/validation';
type Fetch = typeof fetch;
type Options = { fetchImpl?: Fetch; signal?: AbortSignal; timeoutMs?: number };
const messages: Record<number, string> = {
  400: 'The backend rejected this input. Check the English text.',
  401: 'Your translator credentials were rejected. Update them in Settings.',
  403: 'This account does not have permission to translate.',
  422: 'The provider could not translate this content. Try different text.',
  429: 'The translation rate limit was reached. Try again later.',
  502: 'The translation provider failed. Try again later.',
  503: 'The translation provider is unavailable or rate-limited. Try again later.',
  504: 'The translation provider timed out. You can try again.'
};
async function request(path: string, init: RequestInit, options: Options): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? REQUEST_TIMEOUT);
  try {
    if (controller.signal.aborted) throw new ClientError('CANCELLED', 'Request cancelled.');
    const response = await (options.fetchImpl ?? fetch)(BASE_URL + path, {
      ...init, signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store'
    });
    // Defense in depth in addition to Expo Fetch's native redirect:error handling.
    if (response.redirected || (response.url && response.url !== BASE_URL + path) || (response.status >= 300 && response.status < 400))
      throw new ClientError('REDIRECT', 'Unexpected backend redirect. Check the local server configuration.');
    if (response.status !== 200) throw new ClientError(String(response.status), messages[response.status] ?? 'The backend returned an unexpected HTTP error.');
    try {
      const data: unknown = await response.json();
      if (controller.signal.aborted) throw new ClientError('CANCELLED', 'Request cancelled.');
      return data;
    }
    catch { throw new ClientError('RESPONSE', 'The backend returned invalid JSON.'); }
  } catch (error) {
    if (timedOut) throw new ClientError('TIMEOUT', 'The request exceeded 55 seconds. Check the backend before retrying.');
    if (options.signal?.aborted) throw new ClientError('CANCELLED', 'Request cancelled.');
    if (error instanceof ClientError) throw error;
    throw new ClientError('NETWORK', 'Cannot reach the local backend. Check Liberty, ADB reverse and Android local HTTP access.');
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', cancel);
  }
}
export async function translate(text: string, account: Account, options: Options = {}): Promise<Translation> {
  validateText(text);
  const authorization = basicAuthorization(account);
  const data = await request('/api/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authorization },
    body: JSON.stringify({ text, sourceLanguage: 'English' })
  }, options) as Partial<Translation> | null;
  if (!data || typeof data !== 'object' || data.originalText !== text || data.sourceLanguage !== 'English'
      || data.targetLanguage !== 'Moroccan Darija' || typeof data.translatedText !== 'string'
      || !data.translatedText.trim() || !validUnicode(data.translatedText))
    throw new ClientError('RESPONSE', 'The backend returned an empty or invalid translation.');
  return { originalText: text, translatedText: data.translatedText, sourceLanguage: 'English', targetLanguage: 'Moroccan Darija' };
}
export async function checkHealth(options: Options = {}): Promise<boolean> {
  try {
    const data = await request('/api/health', { method: 'GET' }, { timeoutMs: 5000, ...options }) as { status?: string } | null;
    return data?.status === 'UP';
  } catch { return false; }
}
