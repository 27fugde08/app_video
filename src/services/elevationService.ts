/**
 * CreatorOS - Just-In-Time Elevation Service (Windows UAC / macOS Administrator)
 * ==============================================================================
 * Provides front-end utility for requesting elevated privileges on demand
 * for administrative tasks (System proxy setting, protected folder creation,
 * high-performance hardware acceleration, driver level actions).
 */

import { sysLogger } from "../utils/logger";

export interface ElevationResult {
  success: boolean;
  output?: string;
  error?: string;
}

class ElevationService {
  /**
   * Check if the application is currently running with Administrator privileges
   */
  public async isElevated(): Promise<boolean> {
    if (typeof window !== "undefined" && (window as any).electronAPI?.checkIsElevated) {
      try {
        const res = await (window as any).electronAPI.checkIsElevated();
        return !!res?.isElevated;
      } catch (err) {
        sysLogger.warn("ElevationService", "isElevatedCheck", "Failed to check elevation state", { err });
      }
    }
    return false;
  }

  /**
   * Execute a command with elevated (Administrator / Root) privileges on demand
   * Displays OS UAC Prompt (Windows) or Password Request (macOS/Linux)
   */
  public async executeElevated(command: string): Promise<ElevationResult> {
    sysLogger.info("ElevationService", "executeElevated", `Requesting elevation for command: ${command}`);

    if (typeof window !== "undefined" && (window as any).electronAPI?.executeElevated) {
      try {
        const result = await (window as any).electronAPI.executeElevated(command);
        if (result.success) {
          sysLogger.info("ElevationService", "executeElevated", "Elevated command executed successfully");
          return { success: true, output: result.output };
        } else {
          sysLogger.error("ElevationService", "executeElevated", new Error(result.error), { command });
          return { success: false, error: result.error };
        }
      } catch (err: any) {
        sysLogger.error("ElevationService", "executeElevatedIPC", err, { command });
        return { success: false, error: err.message || "Failed IPC execution" };
      }
    }

    // Fallback for Web/Browser Preview
    sysLogger.warn("ElevationService", "executeElevatedFallback", "Running in browser preview; elevated IPC bypassed.");
    return {
      success: true,
      output: `[Web Fallback Simulating Elevation]: ${command}`
    };
  }

  /**
   * Helper: Create protected directory with admin privileges if standard mkdir fails
   */
  public async createProtectedDirectory(targetPath: string): Promise<ElevationResult> {
    const cmd = `mkdir "${targetPath}"`;
    return this.executeElevated(cmd);
  }

  /**
   * Helper: Configure Windows System Proxy with elevated privileges
   */
  public async setWindowsSystemProxy(proxyServer: string, enable: boolean): Promise<ElevationResult> {
    const enableVal = enable ? 1 : 0;
    const cmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d ${enableVal} /f && reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`;
    return this.executeElevated(cmd);
  }
}

export const elevationService = new ElevationService();
export default elevationService;
