/**
 * CreatorOS - Lightweight CancellationToken Implementation
 * Supports cooperative task cancellation, AbortController binding, and cleanup listeners.
 */

export class CancellationToken {
  private _isCancelled = false;
  private _reason: string = '';
  private _listeners: Array<(reason: string) => void> = [];
  public readonly abortController: AbortController = new AbortController();

  get isCancellationRequested(): boolean {
    return this._isCancelled;
  }

  get reason(): string {
    return this._reason;
  }

  /**
   * Throws an error if cancellation has been requested.
   */
  public throwIfCancellationRequested(): void {
    if (this._isCancelled) {
      throw new Error(this._reason || 'Tác vụ đã bị hủy bởi người dùng.');
    }
  }

  /**
   * Registers a callback listener to be executed upon cancellation.
   */
  public onCancellationRequested(callback: (reason: string) => void): () => void {
    if (this._isCancelled) {
      callback(this._reason);
      return () => {};
    }
    this._listeners.push(callback);

    // Return unregister function
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Triggers the cancellation signal.
   */
  public cancel(reason: string = 'Tác vụ đã bị hủy bởi người dùng.'): void {
    if (this._isCancelled) return;
    this._isCancelled = true;
    this._reason = reason;

    try {
      this.abortController.abort(reason);
    } catch {
      // Ignored
    }

    const listeners = [...this._listeners];
    this._listeners = [];
    for (const listener of listeners) {
      try {
        listener(reason);
      } catch (err) {
        console.error('[CancellationToken] Error in listener:', err);
      }
    }
  }
}

export class CancellationTokenSource {
  public readonly token: CancellationToken = new CancellationToken();

  public cancel(reason?: string): void {
    this.token.cancel(reason);
  }
}
