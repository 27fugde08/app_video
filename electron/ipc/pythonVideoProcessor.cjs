/**
 * CreatorOS Desktop - Python Video Processor IPC Module (Electron Main Process)
 * 
 * Manages background execution of Python video processing scripts:
 * - Spawns child Python processes with dynamically resolved binary paths
 * - Streams realtime progress (0-100%) and logs from stdout/stderr to Renderer via IPC
 * - Implements Windows-safe tree-killing (taskkill /T /F) for immediate task cancellation
 * - Handles process lifecycle, timeout limits, and error catching
 */

const { ipcMain, app } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class PythonVideoProcessorManager {
  constructor() {
    /** @type {Map<string, { process: import('child_process').ChildProcess, config: any, sender: import('electron').WebContents, startTime: number }>} */
    this.activeTasks = new Map();
    this.setupIpcHandlers();
  }

  /**
   * Resolve best available Python binary executable
   * @param {string} [customPath]
   * @returns {string}
   */
  resolvePythonBinary(customPath) {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    // Check project local virtual environments
    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    const baseDir = isDev ? path.join(__dirname, '../../') : process.resourcesPath;

    const candidatePaths = [
      process.env.PYTHON_PATH,
      path.join(baseDir, 'venv/Scripts/python.exe'),
      path.join(baseDir, '.venv/Scripts/python.exe'),
      path.join(baseDir, 'venv/bin/python'),
      path.join(baseDir, '.venv/bin/python'),
      path.join(baseDir, 'bin/python.exe')
    ].filter(Boolean);

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Fallback to system PATH
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Parse Python stdout/stderr lines to extract progress percentage and stage
   * @param {string} line
   * @returns {{ progress?: number, stage?: string, message?: string, isJson?: boolean } | null}
   */
  parseOutputLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // 1. Try parsing JSON structured progress: {"progress": 45, "stage": "Transcribing", "message": "..."}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.progress === 'number' || parsed.stage || parsed.status) {
          return {
            progress: typeof parsed.progress === 'number' ? Math.min(100, Math.max(0, parsed.progress)) : undefined,
            stage: parsed.stage || parsed.status || 'processing',
            message: parsed.message || parsed.text || trimmed,
            isJson: true
          };
        }
      } catch {
        // Not valid JSON, fallback to regex patterns
      }
    }

    // 2. Regex Pattern: PROGRESS: 45% or PROGRESS:45
    const progressMatch = trimmed.match(/PROGRESS[:\s]+(\d+(\.\d+)?)\s*%/i) || trimmed.match(/PROGRESS[:\s]+(\d+(\.\d+)?)/i);
    if (progressMatch) {
      const val = parseFloat(progressMatch[1]);
      return {
        progress: Math.min(100, Math.max(0, val)),
        message: trimmed
      };
    }

    // 3. Regex Pattern: [45/100] or (45/100)
    const ratioMatch = trimmed.match(/\[(\d+)\/(\d+)\]/) || trimmed.match(/\((\d+)\/(\d+)\)/);
    if (ratioMatch) {
      const current = parseFloat(ratioMatch[1]);
      const total = parseFloat(ratioMatch[2]);
      if (total > 0) {
        return {
          progress: Math.min(100, Math.round((current / total) * 100)),
          message: trimmed
        };
      }
    }

    // 4. Regex Pattern: Stage marker e.g., STAGE: Voice Cloning
    const stageMatch = trimmed.match(/STAGE[:\s]+([^\n\r]+)/i);
    if (stageMatch) {
      return {
        stage: stageMatch[1].trim(),
        message: trimmed
      };
    }

    return { message: trimmed };
  }

  /**
   * Safely terminate process on Windows (tree-kill) or POSIX
   * @param {number} pid
   * @returns {Promise<boolean>}
   */
  killProcessTree(pid) {
    return new Promise((resolve) => {
      if (!pid) return resolve(false);

      if (process.platform === 'win32') {
        // Windows: /T kills child tree, /F forces termination
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
          if (err) {
            console.warn(`[PythonProcessor] taskkill warning on PID ${pid}:`, err.message);
          }
          resolve(true);
        });
      } else {
        // Linux / macOS
        try {
          process.kill(-pid, 'SIGKILL');
          resolve(true);
        } catch {
          try {
            process.kill(pid, 'SIGKILL');
            resolve(true);
          } catch {
            resolve(false);
          }
        }
      }
    });
  }

  /**
   * Register IPC communication channels with Electron Renderer
   */
  setupIpcHandlers() {
    // 1. Start Python Video Processing Task
    ipcMain.handle('python:start-video-processing', async (event, config) => {
      const {
        taskId = `py_task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        scriptPath,
        args = [],
        pythonPath: customPythonPath,
        inputFilePath,
        outputFilePath,
        extraParams = {}
      } = config || {};

      if (!scriptPath) {
        return { success: false, error: 'Tham số scriptPath là bắt buộc.' };
      }

      if (this.activeTasks.has(taskId)) {
        return { success: false, error: `Tác vụ với Task ID ${taskId} đang chạy.` };
      }

      const pythonExe = this.resolvePythonBinary(customPythonPath);
      const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
      const resolvedScript = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.resolve(isDev ? path.join(__dirname, '../../') : process.resourcesPath, scriptPath);

      if (!fs.existsSync(resolvedScript)) {
        return { success: false, error: `Không tìm thấy file script Python tại: ${resolvedScript}` };
      }

      // Build CLI arguments
      const cliArgs = [resolvedScript, ...args];
      if (inputFilePath) cliArgs.push('--input', inputFilePath);
      if (outputFilePath) cliArgs.push('--output', outputFilePath);
      if (Object.keys(extraParams).length > 0) {
        cliArgs.push('--params', JSON.stringify(extraParams));
      }

      console.log(`[PythonProcessor] Spawning task [${taskId}]: ${pythonExe} ${cliArgs.join(' ')}`);

      try {
        const pyProcess = spawn(pythonExe, cliArgs, {
          cwd: path.dirname(resolvedScript),
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'UTF-8'
          },
          detached: process.platform !== 'win32',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const taskEntry = {
          process: pyProcess,
          config,
          sender: event.sender,
          startTime: Date.now()
        };

        this.activeTasks.set(taskId, taskEntry);

        // Handle stdout
        pyProcess.stdout.on('data', (data) => {
          const rawText = data.toString();
          const lines = rawText.split(/\r?\n/).filter(Boolean);

          for (const line of lines) {
            const parsed = this.parseOutputLine(line);
            
            // Forward raw log
            if (!event.sender.isDestroyed()) {
              event.sender.send('python:log', {
                taskId,
                level: 'info',
                text: line,
                timestamp: new Date().toISOString()
              });

              // Forward parsed progress
              if (parsed && (parsed.progress !== undefined || parsed.stage)) {
                event.sender.send('python:progress', {
                  taskId,
                  progress: parsed.progress,
                  stage: parsed.stage,
                  message: parsed.message,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        });

        // Handle stderr
        pyProcess.stderr.on('data', (data) => {
          const rawText = data.toString();
          const lines = rawText.split(/\r?\n/).filter(Boolean);

          for (const line of lines) {
            const parsed = this.parseOutputLine(line);

            if (!event.sender.isDestroyed()) {
              event.sender.send('python:log', {
                taskId,
                level: 'warn',
                text: line,
                timestamp: new Date().toISOString()
              });

              // Some libraries output progress in stderr (e.g. tqdm, ffmpeg)
              if (parsed && (parsed.progress !== undefined || parsed.stage)) {
                event.sender.send('python:progress', {
                  taskId,
                  progress: parsed.progress,
                  stage: parsed.stage,
                  message: parsed.message,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        });

        // Handle process exit / completion
        pyProcess.on('close', (code, signal) => {
          const durationMs = Date.now() - taskEntry.startTime;
          this.activeTasks.delete(taskId);

          console.log(`[PythonProcessor] Task [${taskId}] finished with code ${code}, signal ${signal} (${durationMs}ms)`);

          if (!event.sender.isDestroyed()) {
            if (code === 0) {
              event.sender.send('python:completed', {
                taskId,
                success: true,
                outputFilePath,
                durationMs,
                timestamp: new Date().toISOString()
              });
            } else if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === 1 && taskEntry.cancelled) {
              event.sender.send('python:cancelled', {
                taskId,
                message: 'Tác vụ đã bị hủy bởi người dùng.',
                durationMs
              });
            } else {
              event.sender.send('python:error', {
                taskId,
                exitCode: code,
                signal,
                error: `Tiến trình Python kết thúc với mã lỗi ${code}`,
                durationMs
              });
            }
          }
        });

        pyProcess.on('error', (err) => {
          this.activeTasks.delete(taskId);
          console.error(`[PythonProcessor] Failed to spawn task [${taskId}]:`, err);
          if (!event.sender.isDestroyed()) {
            event.sender.send('python:error', {
              taskId,
              error: `Lỗi khởi chạy Python: ${err.message}`
            });
          }
        });

        return {
          success: true,
          taskId,
          pid: pyProcess.pid,
          message: 'Tiến trình Python đã khởi chạy thành công.'
        };
      } catch (err) {
        this.activeTasks.delete(taskId);
        return { success: false, error: err.message };
      }
    });

    // 2. Cancel Running Python Video Processing Task
    ipcMain.handle('python:cancel-video-processing', async (event, { taskId }) => {
      if (!taskId || !this.activeTasks.has(taskId)) {
        return { success: false, message: `Không tìm thấy tác vụ đang chạy với ID: ${taskId}` };
      }

      const task = this.activeTasks.get(taskId);
      task.cancelled = true;

      console.log(`[PythonProcessor] Cancelling task [${taskId}] (PID: ${task.process?.pid})...`);
      
      const killed = await this.killProcessTree(task.process?.pid);
      this.activeTasks.delete(taskId);

      return {
        success: killed,
        taskId,
        message: killed ? 'Đã hủy tác vụ thành công.' : 'Không thể ngắt tiến trình.'
      };
    });

    // 3. Get Active Running Tasks
    ipcMain.handle('python:get-active-tasks', async () => {
      const list = [];
      for (const [taskId, task] of this.activeTasks.entries()) {
        list.push({
          taskId,
          pid: task.process?.pid,
          startTime: task.startTime,
          elapsedSeconds: Math.floor((Date.now() - task.startTime) / 1000),
          config: task.config
        });
      }
      return { success: true, count: list.length, tasks: list };
    });
  }

  /**
   * Terminate all running Python tasks (e.g. on application exit)
   */
  async cleanup() {
    console.log(`[PythonProcessor] Cleaning up ${this.activeTasks.size} active Python task(s)...`);
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.process?.pid) {
        await this.killProcessTree(task.process.pid);
      }
    }
    this.activeTasks.clear();
  }
}

let pythonProcessorManagerInstance = null;

function initPythonVideoProcessor() {
  if (!pythonProcessorManagerInstance) {
    pythonProcessorManagerInstance = new PythonVideoProcessorManager();
  }
  return pythonProcessorManagerInstance;
}

module.exports = {
  initPythonVideoProcessor,
  PythonVideoProcessorManager
};
