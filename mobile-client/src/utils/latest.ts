export class LatestRequest {
  private revision = 0;
  private controller?: AbortController;
  cancel() { this.revision++; this.controller?.abort(); this.controller = undefined; }
  async run<T>(task: (signal: AbortSignal) => Promise<T>, events: { success: (value: T) => void; failure: (error: unknown) => void; settled: () => void }) {
    this.cancel(); const revision = this.revision;
    this.controller = new AbortController();
    try { const value = await task(this.controller.signal); if (revision === this.revision) events.success(value); }
    catch (error) { if (revision === this.revision) events.failure(error); }
    finally { if (revision === this.revision) { this.controller = undefined; events.settled(); } }
  }
}
