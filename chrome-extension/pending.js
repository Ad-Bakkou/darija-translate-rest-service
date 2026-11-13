export const MENU_ID = 'translate-to-darija';
export const PENDING_TTL = 5 * 60 * 1000;
export const pendingKey = windowId => `pendingSelection:${windowId}`;
export function createSelection(text, windowId, now = Date.now()) {
  return { id: crypto.randomUUID(), text, windowId, createdAt: now };
}
export function createMailbox(storage, now = Date.now) {
  let queue = Promise.resolve();
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  return {
    put: selection => serial(() => storage.set({ [pendingKey(selection.windowId)]: selection })),
    take: windowId => serial(async () => {
      const key = pendingKey(windowId);
      const item = (await storage.get(key))[key];
      await storage.remove(key);
      if (!item || now() - item.createdAt > PENDING_TTL || now() < item.createdAt) return null;
      return item;
    }),
    remove: windowId => serial(() => storage.remove(pendingKey(windowId)))
  };
}
export function handleSelectionClick(info, tab, { sidePanel, mailbox, notify, onError = () => {} }) {
  if (info.menuItemId !== MENU_ID || typeof info.selectionText !== 'string' || !Number.isInteger(tab?.windowId)) return;
  // This MUST run synchronously in the user gesture, before any storage awaits.
  let opening;
  try { opening = sidePanel.open({ windowId: tab.windowId }); } catch { onError(); }
  Promise.resolve(opening).catch(onError);
  const selection = createSelection(info.selectionText, tab.windowId);
  return mailbox.put(selection).then(() => notify({ type: 'selection-ready', windowId: tab.windowId })).catch(onError);
}
