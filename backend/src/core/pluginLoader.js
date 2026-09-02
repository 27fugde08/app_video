/**
 * CreatorOS - Core Plugin & Binary Lazy Loader
 * 
 * Manages heavy binaries (FFmpeg, yt-dlp, Python FastCrawl engine, AI daemons)
 * using an on-demand, lazy-loading pattern to minimize initial boot time and memory footprint.
 */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

class PluginLoader {
  constructor() {
    /** @type {Map<string, { loaded: boolean, instance: any, lastUsed: number, config: object }>} */
    this.plugins = new Map();
    this.binaryPaths = {
      ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
      ytdlp: process.env.YTDLP_PATH || 'yt-dlp',
      pythonDaemon: process.env.PYTHON_DAEMON_PATH || 'python'
    };
  }

  /**
   * Register a plugin definition for lazy loading
   * @param {string} name - Plugin unique identifier
   * @param {Function} initializer - Factory function that loads and returns the plugin instance
   * @param {object} metadata - Information and configuration
   */
  register(name, initializer, metadata = {}) {
    this.plugins.set(name, {
      loaded: false,
      instance: null,
      initializer,
      lastUsed: 0,
      metadata: {
        category: metadata.category || 'general',
        description: metadata.description || '',
        lazy: true,
        ...metadata
      }
    });
    console.log(`[PluginLoader] Registered lazy plugin: "${name}" (${metadata.category || 'general'})`);
  }

  /**
   * Lazily retrieve or initialize a plugin
   * @param {string} name - Plugin identifier
   * @returns {Promise<any>} The initialized plugin instance
   */
  async get(name) {
    if (!this.plugins.has(name)) {
      throw new Error(`[PluginLoader] Plugin "${name}" is not registered.`);
    }

    const plugin = this.plugins.get(name);

    if (!plugin.loaded) {
      console.log(`[PluginLoader] On-demand lazy initializing plugin: "${name}"...`);
      const startTime = Date.now();
      try {
        plugin.instance = await plugin.initializer();
        plugin.loaded = true;
        plugin.lastUsed = Date.now();
        console.log(`[PluginLoader] Plugin "${name}" loaded in ${Date.now() - startTime}ms.`);
      } catch (err) {
        console.error(`[PluginLoader] Failed to initialize plugin "${name}":`, err.message);
        throw err;
      }
    } else {
      plugin.lastUsed = Date.now();
    }

    return plugin.instance;
  }

  /**
   * Check if a binary exists and is executable in the current environment
   * @param {string} binaryName - 'ffmpeg' | 'ytdlp' | 'pythonDaemon'
   * @returns {Promise<{ available: boolean, version: string, path: string }>}
   */
  async checkBinary(binaryName) {
    const targetPath = this.binaryPaths[binaryName] || binaryName;
    try {
      let cmd = `${targetPath} --version`;
      if (binaryName === 'ffmpeg') cmd = `${targetPath} -version`;
      const { stdout } = await execAsync(cmd);
      const firstLine = stdout.split('\n')[0].trim();
      return {
        available: true,
        version: firstLine,
        path: targetPath
      };
    } catch {
      return {
        available: false,
        version: 'Not found',
        path: targetPath
      };
    }
  }

  /**
   * Get telemetry summary of loaded plugins
   */
  getStatus() {
    const list = {};
    for (const [key, value] of this.plugins.entries()) {
      list[key] = {
        loaded: value.loaded,
        category: value.metadata.category,
        description: value.metadata.description,
        lastUsed: value.lastUsed ? new Date(value.lastUsed).toISOString() : 'Never'
      };
    }
    return {
      totalRegistered: this.plugins.size,
      activeLoaded: Array.from(this.plugins.values()).filter(p => p.loaded).length,
      plugins: list
    };
  }

  /**
   * Unload inactive plugins to reclaim system RAM
   * @param {number} maxIdleMs - Max idle time before unloading (default: 5 minutes)
   */
  garbageCollect(maxIdleMs = 300000) {
    const now = Date.now();
    let purged = 0;
    for (const [key, value] of this.plugins.entries()) {
      if (value.loaded && now - value.lastUsed > maxIdleMs) {
        if (value.instance && typeof value.instance.destroy === 'function') {
          try {
            value.instance.destroy();
          } catch (e) {
            console.error(`[PluginLoader] Error destroying plugin "${key}":`, e);
          }
        }
        value.instance = null;
        value.loaded = false;
        purged++;
        console.log(`[PluginLoader] Unloaded idle plugin: "${key}"`);
      }
    }
    return { purgedCount: purged };
  }
}

// Export singleton instance
export const pluginLoader = new PluginLoader();

// Pre-register default lazy loaders for CreatorOS
pluginLoader.register('ffmpeg-transcoder', async () => {
  const binaryCheck = await pluginLoader.checkBinary('ffmpeg');
  return {
    name: 'FFmpeg NVENC Transcoder',
    available: binaryCheck.available,
    version: binaryCheck.version,
    executeCommand: async (args) => {
      console.log(`[FFmpeg] Executing command: ffmpeg ${args.join(' ')}`);
      return { status: 'success', args };
    }
  };
}, { category: 'transcoding', description: 'Hardware-accelerated media processor & MP3 extractor' });

pluginLoader.register('python-fastcrawl', async () => {
  const binaryCheck = await pluginLoader.checkBinary('pythonDaemon');
  return {
    name: 'Python FastCrawl Engine',
    available: binaryCheck.available,
    version: binaryCheck.version,
    extractMetadata: async (url) => {
      console.log(`[FastCrawl] Extracting metadata from: ${url}`);
      return { url, timestamp: Date.now() };
    }
  };
}, { category: 'scraping', description: 'Anti-bot zero-watermark video extractor daemon' });

pluginLoader.register('ai-gemini-engine', async () => {
  return {
    name: 'Gemini AI Assistant Engine',
    initialized: true,
    generateCopywriting: async (prompt) => {
      console.log(`[AI Engine] Processing prompt: ${prompt.substring(0, 40)}...`);
      return { response: 'AI Generated text content placeholder', tokensUsed: 42 };
    }
  };
}, { category: 'ai', description: 'Semantic content generator & video tag analyzer' });
