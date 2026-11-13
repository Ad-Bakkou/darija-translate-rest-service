import { MENU_ID, createMailbox, handleSelectionClick } from './pending.js';
import { restrictStorage } from './settings.js';
const mailbox = createMailbox(chrome.storage.session);
function issue() { chrome.action.setBadgeText({ text: '!' }).catch(() => {}); chrome.action.setTitle({ title: 'Open DarijaTranslate manually; check extension permissions.' }).catch(() => {}); }
async function configure() {
  try {
    await restrictStorage();
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: MENU_ID, title: 'Translate to Darija', contexts: ['selection'], documentUrlPatterns: ['http://*/*', 'https://*/*'] }, () => { if (chrome.runtime.lastError) issue(); });
  } catch { issue(); }
}
chrome.runtime.onInstalled.addListener(configure);
chrome.runtime.onStartup.addListener(configure);
chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleSelectionClick(info, tab, { sidePanel: chrome.sidePanel, mailbox,
    notify: message => chrome.runtime.sendMessage(message).catch(() => {}), onError: issue });
});
chrome.windows.onRemoved.addListener(id => { mailbox.remove(id).catch(() => {}); });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('sidepanel.html')) return;
  if (message?.type !== 'take-selection' || !Number.isInteger(message.windowId)) return;
  mailbox.take(message.windowId).then(selection => sendResponse({ selection }), () => sendResponse({ error: true }));
  return true;
});
