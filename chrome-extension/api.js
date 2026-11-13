export const BASE_URL = 'http://127.0.0.1:9080';
export const MAX_CODE_POINTS = 5000;
export class ApiError extends Error {
  constructor(code, message) { super(message); this.name = 'ApiError'; this.code = code; }
}
export function validateText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new ApiError('INPUT', 'Enter or select some English text first.');
  if ([...text].length > MAX_CODE_POINTS) throw new ApiError('INPUT', 'Use 5,000 characters or fewer. Your text has not been shortened.');
  if (!text.isWellFormed()) throw new ApiError('INPUT', 'The text contains an invalid Unicode character. Please paste it again.');
  return text;
}
export function basicAuthorization(credentials) {
  const { username, password } = credentials || {};
  if (typeof username !== 'string' || !username.trim() || username.includes(':') || typeof password !== 'string' || !password.trim()) {
    throw new ApiError('CREDENTIALS', 'Add your translator username and password in Settings.');
  }
  return 'Basic ' + btoa(Array.from(new TextEncoder().encode(username + ':' + password), byte => String.fromCharCode(byte)).join(''));
}
const errors = {
  400: ['INPUT', 'The service could not accept this text. Check the input and try again.'],
  401: ['AUTH', 'Your translator credentials were not accepted. Update them in Settings.'],
  403: ['FORBIDDEN', 'This account does not have permission to translate. Check its translator role.'],
  422: ['BLOCKED', 'The translation provider could not translate this content. Try different text.'],
  502: ['PROVIDER', 'The translation provider could not complete the request. Try again later.'],
  503: ['UNAVAILABLE', 'Translation is temporarily unavailable. Check provider availability and server configuration.'],
  504: ['TIMEOUT', 'The translation provider timed out. Please try again later.']
};
export async function translate(text, credentials, { signal, fetchImpl = fetch, timeoutMs = 55000 } = {}) {
  validateText(text);
  const authorization = basicAuthorization(credentials);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(BASE_URL + '/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: authorization },
      body: JSON.stringify({ text, sourceLanguage: 'English' }), signal: controller.signal,
      redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    if (!response.ok) {
      let code;
      try { code = (await response.json()).error; } catch { /* Container 401 can be HTML or empty. */ }
      if (response.status === 503 && code === 'UPSTREAM_RATE_LIMIT') throw new ApiError('RATE_LIMIT', 'The provider quota or rate limit has been reached. Try again later.');
      const [kind, message] = errors[response.status] || ['SERVER', 'The service encountered an unexpected error. Please try again later.'];
      throw new ApiError(kind, message);
    }
    let result;
    try { result = await response.json(); } catch { throw new ApiError('RESPONSE', 'The service returned an unreadable response.'); }
    if (!result || typeof result !== 'object' || result.originalText !== text || result.sourceLanguage !== 'English' || result.targetLanguage !== 'Moroccan Darija' || typeof result.translatedText !== 'string' || !result.translatedText.trim()) {
      throw new ApiError('RESPONSE', 'The service returned an incomplete translation.');
    }
    return result.translatedText;
  } catch (error) {
    if (timedOut) throw new ApiError('TIMEOUT', 'The local service did not finish within 55 seconds. Please try again later.');
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (error instanceof ApiError) throw error;
    throw new ApiError('NETWORK', 'Cannot reach the local service. Start Open Liberty on port 9080 and check extension site access.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
export async function checkHealth({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(BASE_URL + '/api/health', { signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    return response.ok && (await response.json()).status === 'UP';
  } catch { return false; } finally { clearTimeout(timer); }
}
