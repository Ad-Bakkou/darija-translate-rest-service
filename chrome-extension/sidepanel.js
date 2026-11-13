import { translate, checkHealth, validateText, ApiError } from './api.js';
import { getCredentials, saveCredentials, forgetCredentials } from './settings.js';
import { LatestRequest, showResult, arabicLocalVoice } from './controller.js';
const $ = id => document.getElementById(id);
const source = $('source');
const latest = new LatestRequest();
let windowId, busy = false, autoPending = false, output = '', draining = false, drainAgain = false;
const synth = globalThis.speechSynthesis;
let utterance, ownCredentialRevision;
function feedback(message, kind = '') { $('feedback').textContent = message; $('feedback').className = 'feedback ' + kind; }
function settings(open) { $('settings').hidden = !open; $('settings-toggle').setAttribute('aria-expanded', String(open)); }
function setBusy(value) {
  busy = value; $('translate').disabled = value; $('result-card').setAttribute('aria-busy', String(value));
  $('translate').textContent = value ? 'Translating…' : 'Translate to Darija ↗';
}
function stopSpeech() { utterance = null; synth?.cancel(); $('stop').disabled = true; }
function result(text = '') {
  stopSpeech(); output = text; showResult($('result'), text); $('empty-result').hidden = !!text;
  $('copy').disabled = !text; $('speak').disabled = !text;
}
function count() { const size = [...source.value].length; $('count').textContent = size.toLocaleString() + ' / 5,000'; $('count').classList.toggle('over-limit', size > 5000); }
function cancel() { latest.cancel(); setBusy(false); stopSpeech(); }
async function submit() {
  if (busy) return;
  const text = source.value;
  try { validateText(text); } catch (error) { feedback(error.message, 'error'); return; }
  result(); setBusy(true); feedback('Translating into Moroccan Darija…', 'loading');
  await latest.run(async signal => {
    const credentials = await getCredentials();
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return translate(text, credentials, { signal });
  }, {
    success: text => { autoPending = false; result(text); feedback('Translation ready.'); },
    failure: error => {
      feedback(error instanceof ApiError ? error.message : 'Extension storage is unavailable. Reload the extension and try again.', 'error');
      if (['AUTH', 'CREDENTIALS'].includes(error.code)) { autoPending = true; settings(true); $('password').focus(); }
    }, settled: () => setBusy(false)
  });
}
source.addEventListener('input', () => { cancel(); autoPending = false; count(); result(); feedback('Ready when you are.'); });
source.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit(); } });
$('translate').addEventListener('click', submit);
$('clear').addEventListener('click', () => { cancel(); autoPending = false; source.value = ''; count(); result(); feedback('Select text from a webpage, or write something above.'); source.focus(); });
$('settings-toggle').addEventListener('click', () => { settings($('settings').hidden); if (!$('settings').hidden) $('username').focus(); });
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault(); cancel();
  try {
    ownCredentialRevision = crypto.randomUUID();
    await saveCredentials($('username').value, $('password').value, chrome.storage.session, ownCredentialRevision);
    $('password').value = ''; $('account-status').textContent = 'Account saved for this browser session.'; settings(false);
    if (autoPending) submit(); else feedback('Account saved. You can now translate.');
  } catch (error) { feedback(error instanceof ApiError ? error.message : 'Could not save credentials in session storage.', 'error'); }
});
$('forget').addEventListener('click', async () => {
  cancel(); autoPending = false; result(); $('password').value = ''; $('username').value = '';
  try { await forgetCredentials(); $('account-status').textContent = 'Account removed.'; feedback('Credentials forgotten. Add an account to translate again.'); }
  catch { feedback('Could not clear session storage. Disable or reload the extension to clear this session.', 'error'); }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.translatorCredentials) {
    if (changes.translatorCredentials.newValue?.revision === ownCredentialRevision) { ownCredentialRevision = null; return; }
    cancel(); result();
  }
});
$('copy').addEventListener('click', async () => {
  if (!output) return;
  try { await navigator.clipboard.writeText(output); feedback('Translation copied.'); }
  catch { feedback('Clipboard access was blocked. Select the translation and copy it manually.', 'error'); }
});
function speechNote() {
  $('speech-note').textContent = !synth ? 'Speech is unavailable in this browser.' : arabicLocalVoice(synth.getVoices()) ? 'Uses a local Arabic voice. Moroccan pronunciation may vary.' : 'No local Arabic voice is installed. Remote voices are not used.';
}
synth?.addEventListener('voiceschanged', speechNote);
$('speak').addEventListener('click', () => {
  if (!output) return;
  if (!synth || !globalThis.SpeechSynthesisUtterance) { feedback('Speech is unavailable in this browser.', 'error'); return; }
  const voice = arabicLocalVoice(synth.getVoices());
  if (!voice) { feedback('Install an offline Arabic voice in your operating system to use Read aloud.', 'error'); return; }
  stopSpeech();
  const next = new SpeechSynthesisUtterance(output); utterance = next; next.voice = voice; next.lang = voice.lang; next.rate = 0.9;
  next.onend = () => { if (utterance === next) { utterance = null; $('stop').disabled = true; } };
  next.onerror = () => { if (utterance === next) { stopSpeech(); feedback('The local speech engine could not read this translation.', 'error'); } };
  try { synth.speak(next); $('stop').disabled = false; } catch { stopSpeech(); feedback('The local speech engine is unavailable.', 'error'); }
});
$('stop').addEventListener('click', stopSpeech);
window.addEventListener('pagehide', () => { cancel(); });
async function health() {
  $('recheck').disabled = true;
  const online = await checkHealth();
  $('connection').textContent = online ? 'Local service online' : 'Local service unreachable';
  $('connection').className = online ? 'online' : 'offline'; $('recheck').disabled = false;
}
$('recheck').addEventListener('click', health);
async function takePending() {
  if (windowId === undefined) return;
  if (draining) { drainAgain = true; return; }
  draining = true;
  try {
    do {
      drainAgain = false;
      const reply = await chrome.runtime.sendMessage({ type: 'take-selection', windowId });
      if (reply?.error) throw new Error('Mailbox unavailable');
      if (reply?.selection) {
        cancel(); result(); source.value = reply.selection.text; count(); autoPending = true; submit();
      }
    } while (drainAgain);
  } catch { feedback('Could not retrieve selected text. Try the context menu again, or paste it manually.', 'error'); }
  finally { draining = false; }
}
chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'selection-ready' && message.windowId === windowId) takePending();
});
async function initialize() {
  count(); speechNote(); health();
  try {
    windowId = (await chrome.windows.getCurrent()).id;
    const credentials = await getCredentials();
    if (credentials) { $('username').value = credentials.username; $('account-status').textContent = 'An account is available for this browser session.'; }
    else { settings(true); $('account-status').textContent = 'Add your local translator account to get started.'; }
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Open DarijaTranslate' });
    await takePending();
  } catch { feedback('Extension setup is unavailable. Reload DarijaTranslate from chrome://extensions.', 'error'); }
}
initialize();
