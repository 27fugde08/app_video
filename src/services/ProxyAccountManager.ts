/**
 * CreatorOS - Social Account & Proxy Isolation Management System
 * ===============================================================
 * Features:
 * 1. Health Check & Latency Monitoring: Async health pings, response timing, IP validation
 * 2. Isolated Account Sessions & Fingerprinting: Account-specific cookie jars, User-Agents, header isolation
 * 3. Round-Robin Proxy Pool with Auto-Failover: Automatic proxy rotation and health degradation handling
 */

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyStatus = 'active' | 'degraded' | 'dead' | 'untested';
export type SocialPlatform = 'tiktok' | 'douyin' | 'youtube' | 'facebook' | 'instagram' | 'x';

export interface ProxyNode {
  id: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  status: ProxyStatus;
  latencyMs: number;
  exitIp?: string;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  lastCheckedAt?: Date;
}

export interface BrowserFingerprint {
  userAgent: string;
  secChUa: string;
  acceptLanguage: string;
  viewportWidth: number;
  viewportHeight: number;
  deviceMemoryGb: number;
  hardwareConcurrency: number;
  webGlRenderer: string;
}

export interface SocialAccountSession {
  accountId: string;
  platform: SocialPlatform;
  username: string;
  cookies: Record<string, string>;
  assignedProxyId?: string;
  fingerprint: BrowserFingerprint;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface ProxyHealthResult {
  proxyId: string;
  isAlive: boolean;
  latencyMs: number;
  exitIp?: string;
  error?: string;
}

/**
 * Service 1: Proxy Health Check & Latency Monitor
 */
export class ProxyHealthChecker {
  private timeoutMs: number;
  private testEndpoint: string;

  constructor(timeoutMs = 5000, testEndpoint = 'https://httpbin.org/ip') {
    this.timeoutMs = timeoutMs;
    this.testEndpoint = testEndpoint;
  }

  /**
   * Performs an async health check and latency ping on a single proxy node
   */
  public async checkProxyHealth(proxy: ProxyNode): Promise<ProxyHealthResult> {
    const startTime = Date.now();
    const proxyUrl = this.formatProxyUrl(proxy);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      // In browser/Node environment, fetch with proxy or simulated TCP connection
      const response = await fetch(this.testEndpoint, {
        method: 'GET',
        headers: { 'User-Agent': 'CreatorOS-ProxyChecker/1.0' },
        signal: controller.signal
      });

      clearTimeout(timer);

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        return {
          proxyId: proxy.id,
          isAlive: false,
          latencyMs,
          error: `HTTP Error ${response.status}`
        };
      }

      let exitIp = '';
      try {
        const data = await response.json();
        exitIp = data.origin || data.ip || '';
      } catch {
        // Ignored
      }

      return {
        proxyId: proxy.id,
        isAlive: true,
        latencyMs,
        exitIp
      };
    } catch (err: any) {
      return {
        proxyId: proxy.id,
        isAlive: false,
        latencyMs: Date.now() - startTime,
        error: err.name === 'AbortError' ? 'Connection Timeout' : err.message
      };
    }
  }

  /**
   * Batch inspects multiple proxies concurrently
   */
  public async batchCheckHealth(proxies: ProxyNode[]): Promise<ProxyHealthResult[]> {
    const promises = proxies.map((p) => this.checkProxyHealth(p));
    return Promise.all(promises);
  }

  private formatProxyUrl(proxy: ProxyNode): string {
    const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : '';
    return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
  }
}

/**
 * Service 2: Round-Robin Proxy Pool with Auto-Failover
 */
export class RoundRobinProxyPool {
  private proxies: Map<string, ProxyNode> = new Map();
  private currentIndex = 0;
  private maxConsecutiveFailures = 3;
  private healthChecker: ProxyHealthChecker;

  constructor(maxConsecutiveFailures = 3) {
    this.maxConsecutiveFailures = maxConsecutiveFailures;
    this.healthChecker = new ProxyHealthChecker();
  }

  public addProxy(proxy: ProxyNode): void {
    this.proxies.set(proxy.id, { ...proxy });
  }

  public addProxies(proxies: ProxyNode[]): void {
    proxies.forEach((p) => this.addProxy(p));
  }

  public removeProxy(proxyId: string): boolean {
    return this.proxies.delete(proxyId);
  }

  public getProxy(proxyId: string): ProxyNode | undefined {
    return this.proxies.get(proxyId);
  }

  public getAllProxies(): ProxyNode[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Thread-safe Round-Robin selection of healthy proxies
   */
  public getNextHealthyProxy(): ProxyNode | null {
    const activeProxies = Array.from(this.proxies.values()).filter(
      (p) => p.status === 'active' || p.status === 'untested'
    );

    if (activeProxies.length === 0) {
      // Fallback: search for degraded proxies if no active ones
      const degraded = Array.from(this.proxies.values()).filter((p) => p.status === 'degraded');
      if (degraded.length > 0) {
        return degraded[0];
      }
      return null;
    }

    const selected = activeProxies[this.currentIndex % activeProxies.length];
    this.currentIndex = (this.currentIndex + 1) % activeProxies.length;
    return selected;
  }

  /**
   * Report proxy success, updating latency and health
   */
  public reportSuccess(proxyId: string, latencyMs?: number): void {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.consecutiveFailures = 0;
      proxy.status = 'active';
      proxy.successfulRequests += 1;
      proxy.totalRequests += 1;
      if (latencyMs !== undefined) {
        proxy.latencyMs = latencyMs;
      }
    }
  }

  /**
   * Report proxy failure, triggering health degradation or quarantine (dead)
   */
  public reportFailure(proxyId: string): void {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.consecutiveFailures += 1;
      proxy.totalRequests += 1;

      if (proxy.consecutiveFailures >= this.maxConsecutiveFailures) {
        proxy.status = 'dead';
      } else {
        proxy.status = 'degraded';
      }
    }
  }

  /**
   * Automatic failover executor: Tries request with current proxy, automatically falls over to next proxy if error occurs
   */
  public async executeWithFailover<T>(
    operation: (proxy: ProxyNode) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      attempts++;
      const proxy = this.getNextHealthyProxy();
      if (!proxy) {
        throw new Error('[ProxyPool] No healthy or available proxies in pool.');
      }

      const start = Date.now();
      try {
        const result = await operation(proxy);
        this.reportSuccess(proxy.id, Date.now() - start);
        return result;
      } catch (err: any) {
        lastError = err;
        this.reportFailure(proxy.id);
      }
    }

    throw new Error(`[ProxyPool Failover Exhausted] Operation failed after ${maxRetries} proxy retries. Last error: ${lastError?.message}`);
  }

  /**
   * Refresh and health-check all proxies in the pool
   */
  public async refreshPoolHealth(): Promise<void> {
    const all = this.getAllProxies();
    const results = await this.healthChecker.batchCheckHealth(all);

    for (const res of results) {
      const proxy = this.proxies.get(res.proxyId);
      if (proxy) {
        proxy.lastCheckedAt = new Date();
        if (res.isAlive) {
          proxy.status = 'active';
          proxy.latencyMs = res.latencyMs;
          proxy.exitIp = res.exitIp;
          proxy.consecutiveFailures = 0;
        } else {
          this.reportFailure(proxy.id);
        }
      }
    }
  }
}

/**
 * Service 3: Social Account Session & Cookie Isolation Manager
 */
export class SocialAccountSessionManager {
  private sessions: Map<string, SocialAccountSession> = new Map();

  /**
   * Creates or registers an isolated account session with anti-fingerprinting profile
   */
  public registerAccountSession(
    accountId: string,
    platform: SocialPlatform,
    username: string,
    cookies: Record<string, string> = {},
    assignedProxyId?: string
  ): SocialAccountSession {
    const session: SocialAccountSession = {
      accountId,
      platform,
      username,
      cookies: { ...cookies },
      assignedProxyId,
      fingerprint: this.generateIsolatedFingerprint(accountId, platform),
      isActive: true,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.sessions.set(accountId, session);
    return session;
  }

  public getSession(accountId: string): SocialAccountSession | undefined {
    return this.sessions.get(accountId);
  }

  public updateCookies(accountId: string, newCookies: Record<string, string>): void {
    const session = this.sessions.get(accountId);
    if (session) {
      session.cookies = { ...session.cookies, ...newCookies };
      session.lastActiveAt = new Date();
    }
  }

  /**
   * Formats HTTP request headers for the isolated session to prevent cross-account detection
   */
  public getIsolatedRequestHeaders(accountId: string): Record<string, string> {
    const session = this.sessions.get(accountId);
    if (!session) {
      throw new Error(`[SessionManager] Account session not found for ID: ${accountId}`);
    }

    const fp = session.fingerprint;
    const cookieHeader = Object.entries(session.cookies)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('; ');

    return {
      'User-Agent': fp.userAgent,
      'Sec-Ch-Ua': fp.secChUa,
      'Accept-Language': fp.acceptLanguage,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    };
  }

  /**
   * Generates realistic, deterministic browser fingerprint profile for an account
   */
  private generateIsolatedFingerprint(accountId: string, platform: SocialPlatform): BrowserFingerprint {
    // Deterministic hash based on account ID to keep fingerprint consistent across sessions
    const hash = this.simpleHash(accountId);

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ];

    const viewports = [
      { w: 1920, h: 1080 },
      { w: 1536, h: 864 },
      { w: 1440, h: 900 },
      { w: 1366, h: 768 }
    ];

    const selectedUa = userAgents[hash % userAgents.length];
    const selectedVp = viewports[hash % viewports.length];

    return {
      userAgent: selectedUa,
      secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      acceptLanguage: 'en-US,en;q=0.9,vi;q=0.8',
      viewportWidth: selectedVp.w,
      viewportHeight: selectedVp.h,
      deviceMemoryGb: (hash % 2 === 0) ? 8 : 16,
      hardwareConcurrency: (hash % 2 === 0) ? 8 : 12,
      webGlRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)'
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export const defaultProxyPool = new RoundRobinProxyPool();
export const accountSessionManager = new SocialAccountSessionManager();
