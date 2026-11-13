// Guards against both abort-aware fetch and late resolutions from non-cooperative transports.
export class LatestRequest {
  #version = 0;
  #controller;
  cancel() { this.#version++; this.#controller?.abort(); this.#controller = null; }
  async run(task, { success, failure, settled } = {}) {
    this.cancel();
    const version = this.#version;
    this.#controller = new AbortController();
    try { const value = await task(this.#controller.signal); if (version === this.#version) success?.(value); }
    catch (error) { if (version === this.#version && error.name !== 'AbortError') failure?.(error); }
    finally { if (version === this.#version) { this.#controller = null; settled?.(); } }
  }
}
export function showResult(node, text) { node.textContent = text; }
export function arabicLocalVoice(voices) {
  const local = voices.filter(voice => voice.localService && /^ar(?:-|$)/i.test(voice.lang));
  return local.find(voice => /^ar-MA$/i.test(voice.lang)) || local[0] || null;
}
