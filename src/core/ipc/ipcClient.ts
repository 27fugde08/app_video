/**
 * CreatorOS Desktop - Core IPC Client
 * Unified transport client providing bi-directional IPC between UI Layer and Core Daemon.
 */

import { IPCRequest, IPCResponse, HardwareTelemetryData, QueueMetrics, JobDescriptor } from './types';
import { getApiUrl } from '../../utils/apiClient';

class DesktopIPCClient {
  private baseUrl: string;
  private sseSource: EventSource | null = null;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected: boolean = false;

  constructor() {
    const customUrl = (typeof window !== 'undefined' && (window as any).__CREATOROS_API_URL__)
      || (import.meta as any).env?.VITE_BACKEND_URL;
    
    this.baseUrl = customUrl ? customUrl.replace(/\/$/, '') : getApiUrl('/api');

    if (typeof window !== 'undefined') {
      this.initEventStream();
    }
  }

  /**
   * Initialize Server-Sent Events stream from Core Daemon
   */
  private initEventStream() {
    try {
      const streamUrl = this.baseUrl.endsWith('/events') 
        ? this.baseUrl 
        : `${this.baseUrl.replace(/\/downloader$/, '')}/events`;
      this.sseSource = new EventSource(streamUrl);

      this.sseSource.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { connected: true });
      };

      this.sseSource.onerror = () => {
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
      };

      this.sseSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event && parsed.data) {
            this.emit(parsed.event, parsed.data);
          }
        } catch {
          // Non-JSON ping
        }
      };
    } catch (err) {
      console.warn('[IPCClient] EventSource connection failed. Falling back to local IPC simulation.');
    }
  }

  /**
   * Subscribe to real-time events from Core Daemon
   */
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Internal event emitter
   */
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  /**
   * Send Request to Core Daemon via REST / Native IPC
   */
  public async invoke<T = any>(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'POST', body?: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${cleanEndpoint}`;
    if (this.baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      url = `${this.baseUrl.slice(0, -4)}${cleanEndpoint}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CreatorOS-Client': 'Desktop-Renderer-V1'
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `IPC Invoke Failed with HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Core Daemon Healthcheck
   */
  public async getHealth(): Promise<{ status: string; uptime: number }> {
    return this.invoke('/telemetry/health', 'GET');
  }

  /**
   * Get Hardware Telemetry snapshot
   */
  public async getHardwareMetrics(): Promise<{ success: boolean; metrics: any }> {
    return this.invoke('/telemetry/metrics', 'GET');
  }

  /**
   * Dispatch Window Control commands to Native Electron Shell
   */
  public sendWindowControl(action: 'minimize' | 'maximize' | 'close') {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.windowControl(action);
    }
  }

  /**
   * Get connection status to Core Daemon
   */
  public get isDaemonConnected(): boolean {
    return this.isConnected;
  }
}

export const ipcClient = new DesktopIPCClient();
export default ipcClient;
