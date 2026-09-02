/**
 * CreatorOS Desktop - Python Video Processor Client API
 * 
 * Provides typed TypeScript bindings for communicating with the Electron Main Process:
 * - Start video processing tasks with arguments and options
 * - Realtime progress listener (0-100%) and stage updates
 * - Live stdout/stderr log feed subscription
 * - Safe task cancellation (tree-kill)
 */

export interface PythonTaskConfig {
  taskId?: string;
  scriptPath: string;
  args?: string[];
  pythonPath?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  extraParams?: Record<string, any>;
}

export interface PythonProgressEvent {
  taskId: string;
  progress?: number;
  stage?: string;
  message?: string;
  timestamp: string;
}

export interface PythonLogEvent {
  taskId: string;
  level: 'info' | 'warn' | 'error';
  text: string;
  timestamp: string;
}

export interface PythonCompletedEvent {
  taskId: string;
  success: boolean;
  outputFilePath?: string;
  durationMs: number;
  timestamp: string;
}

export interface PythonErrorEvent {
  taskId: string;
  exitCode?: number;
  signal?: string;
  error: string;
  durationMs?: number;
}

export class PythonProcessorClient {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.python);
  }

  /**
   * Check if Native Electron IPC is available
   */
  public isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).electronAPI?.python);
  }

  /**
   * Launch Python video processing script in background
   */
  public async startTask(config: PythonTaskConfig): Promise<{ success: boolean; taskId?: string; pid?: number; error?: string; message?: string }> {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.startVideoProcessing(config);
    }

    // Web simulation fallback for UI development / sandbox
    console.log('[PythonClient] Running in Virtual/Web mode:', config);
    const mockTaskId = config.taskId || `mock_py_${Date.now()}`;
    return {
      success: true,
      taskId: mockTaskId,
      pid: 9999,
      message: 'Mô phỏng khởi chạy Python trong môi trường Web.'
    };
  }

  /**
   * Cancel running Python task
   */
  public async cancelTask(taskId: string): Promise<{ success: boolean; taskId: string; message: string }> {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.cancelVideoProcessing(taskId);
    }

    return {
      success: true,
      taskId,
      message: 'Đã hủy tác vụ mô phỏng.'
    };
  }

  /**
   * Get active Python tasks
   */
  public async getActiveTasks(): Promise<{ success: boolean; count: number; tasks: any[] }> {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.getActiveTasks();
    }

    return { success: true, count: 0, tasks: [] };
  }

  /**
   * Subscribe to progress updates (0-100%)
   */
  public onProgress(callback: (event: PythonProgressEvent) => void): () => void {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.onProgress(callback);
    }
    return () => {};
  }

  /**
   * Subscribe to stdout/stderr log stream
   */
  public onLog(callback: (event: PythonLogEvent) => void): () => void {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.onLog(callback);
    }
    return () => {};
  }

  /**
   * Subscribe to task completion event
   */
  public onCompleted(callback: (event: PythonCompletedEvent) => void): () => void {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.onCompleted(callback);
    }
    return () => {};
  }

  /**
   * Subscribe to task error event
   */
  public onError(callback: (event: PythonErrorEvent) => void): () => void {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.onError(callback);
    }
    return () => {};
  }

  /**
   * Subscribe to task cancellation event
   */
  public onCancelled(callback: (event: { taskId: string; message: string; durationMs: number }) => void): () => void {
    if (this.isAvailable()) {
      return (window as any).electronAPI.python.onCancelled(callback);
    }
    return () => {};
  }
}

export const pythonProcessorClient = new PythonProcessorClient();
export default pythonProcessorClient;
