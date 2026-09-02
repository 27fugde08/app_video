using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Services
{
    public enum ProxyProtocol { Http, Https, Socks4, Socks5 }
    public enum ProxyStatus { Untested, Active, Degraded, Dead }
    public enum SocialPlatform { TikTok, Douyin, YouTube, Facebook, Instagram, X }

    public class ProxyNode
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 8080;
        public ProxyProtocol Protocol { get; set; } = ProxyProtocol.Http;
        public string? Username { get; set; }
        public string? Password { get; set; }
        public ProxyStatus Status { get; set; } = ProxyStatus.Untested;
        public long LatencyMs { get; set; } = 0;
        public string ExitIp { get; set; } = string.Empty;
        public int ConsecutiveFailures { get; set; } = 0;
        public int TotalRequests { get; set; } = 0;
        public int SuccessfulRequests { get; set; } = 0;
        public DateTime? LastCheckedAt { get; set; }
    }

    public class BrowserFingerprint
    {
        public string UserAgent { get; set; } = string.Empty;
        public string SecChUa { get; set; } = string.Empty;
        public string AcceptLanguage { get; set; } = "en-US,en;q=0.9,vi;q=0.8";
        public int ViewportWidth { get; set; } = 1920;
        public int ViewportHeight { get; set; } = 1080;
        public int DeviceMemoryGb { get; set; } = 8;
        public int HardwareConcurrency { get; set; } = 8;
    }

    public class SocialAccountSession
    {
        public string AccountId { get; set; } = string.Empty;
        public SocialPlatform Platform { get; set; } = SocialPlatform.TikTok;
        public string Username { get; set; } = string.Empty;
        public Dictionary<string, string> Cookies { get; set; } = new();
        public string? AssignedProxyId { get; set; }
        public BrowserFingerprint Fingerprint { get; set; } = new();
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    }

    public class ProxyHealthResult
    {
        public string ProxyId { get; set; } = string.Empty;
        public bool IsAlive { get; set; }
        public long LatencyMs { get; set; }
        public string ExitIp { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    /// <summary>
    /// Service kiểm tra sức khỏe và độ trễ (Latency & Health Check) của danh sách Proxy
    /// </summary>
    public class ProxyHealthChecker
    {
        private readonly int _timeoutMs;
        private readonly string _testEndpoint;

        public ProxyHealthChecker(int timeoutMs = 5000, string testEndpoint = "https://httpbin.org/ip")
        {
            _timeoutMs = timeoutMs;
            _testEndpoint = testEndpoint;
        }

        public async Task<ProxyHealthResult> CheckProxyHealthAsync(ProxyNode proxy, CancellationToken cancellationToken = default)
        {
            var sw = Stopwatch.StartNew();
            WebProxy webProxy;

            if (!string.IsNullOrEmpty(proxy.Username) && !string.IsNullOrEmpty(proxy.Password))
            {
                webProxy = new WebProxy(proxy.Host, proxy.Port)
                {
                    Credentials = new NetworkCredential(proxy.Username, proxy.Password)
                };
            }
            else
            {
                webProxy = new WebProxy(proxy.Host, proxy.Port);
            }

            var handler = new HttpClientHandler
            {
                Proxy = webProxy,
                UseProxy = true,
                ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            };

            using var client = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromMilliseconds(_timeoutMs)
            };

            try
            {
                client.DefaultRequestHeaders.UserAgent.ParseAdd("CreatorOS-ProxyChecker/1.0");

                using var response = await client.GetAsync(_testEndpoint, cancellationToken).ConfigureAwait(false);
                sw.Stop();

                if (!response.IsSuccessStatusCode)
                {
                    return new ProxyHealthResult
                    {
                        ProxyId = proxy.Id,
                        IsAlive = false,
                        LatencyMs = sw.ElapsedMilliseconds,
                        ErrorMessage = $"HTTP {(int)response.StatusCode}"
                    };
                }

                string exitIp = string.Empty;
                try
                {
                    string content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                    using var doc = JsonDocument.Parse(content);
                    if (doc.RootElement.TryGetProperty("origin", out var originProp))
                    {
                        exitIp = originProp.GetString() ?? string.Empty;
                    }
                }
                catch { }

                return new ProxyHealthResult
                {
                    ProxyId = proxy.Id,
                    IsAlive = true,
                    LatencyMs = sw.ElapsedMilliseconds,
                    ExitIp = exitIp
                };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new ProxyHealthResult
                {
                    ProxyId = proxy.Id,
                    IsAlive = false,
                    LatencyMs = sw.ElapsedMilliseconds,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<List<ProxyHealthResult>> BatchCheckHealthAsync(IEnumerable<ProxyNode> proxies, CancellationToken cancellationToken = default)
        {
            var tasks = proxies.Select(p => CheckProxyHealthAsync(p, cancellationToken));
            var results = await Task.WhenAll(tasks).ConfigureAwait(false);
            return results.ToList();
        }
    }

    /// <summary>
    /// Thuật toán xoay vòng Round-Robin Proxy Pool với tính năng tự động chuyển đổi khi lỗi (Auto-Failover)
    /// </summary>
    public class RoundRobinProxyPool
    {
        private readonly ConcurrentDictionary<string, ProxyNode> _proxies = new();
        private int _currentIndex = 0;
        private readonly int _maxConsecutiveFailures;
        private readonly ProxyHealthChecker _healthChecker;

        public RoundRobinProxyPool(int maxConsecutiveFailures = 3)
        {
            _maxConsecutiveFailures = maxConsecutiveFailures;
            _healthChecker = new ProxyHealthChecker();
        }

        public void AddProxy(ProxyNode proxy) => _proxies[proxy.Id] = proxy;

        public void AddProxies(IEnumerable<ProxyNode> proxies)
        {
            foreach (var p in proxies) AddProxy(p);
        }

        public bool RemoveProxy(string proxyId) => _proxies.TryRemove(proxyId, out _);

        public List<ProxyNode> GetAllProxies() => _proxies.Values.ToList();

        public ProxyNode? GetNextHealthyProxy()
        {
            var activeList = _proxies.Values
                .Where(p => p.Status == ProxyStatus.Active || p.Status == ProxyStatus.Untested)
                .ToList();

            if (activeList.Count == 0)
            {
                var degradedList = _proxies.Values.Where(p => p.Status == ProxyStatus.Degraded).ToList();
                return degradedList.FirstOrDefault();
            }

            int index = Math.Abs(Interlocked.Increment(ref _currentIndex)) % activeList.Count;
            return activeList[index];
        }

        public void ReportSuccess(string proxyId, long latencyMs = 0)
        {
            if (_proxies.TryGetValue(proxyId, out var proxy))
            {
                proxy.ConsecutiveFailures = 0;
                proxy.Status = ProxyStatus.Active;
                proxy.SuccessfulRequests++;
                proxy.TotalRequests++;
                if (latencyMs > 0) proxy.LatencyMs = latencyMs;
            }
        }

        public void ReportFailure(string proxyId)
        {
            if (_proxies.TryGetValue(proxyId, out var proxy))
            {
                proxy.ConsecutiveFailures++;
                proxy.TotalRequests++;

                if (proxy.ConsecutiveFailures >= _maxConsecutiveFailures)
                {
                    proxy.Status = ProxyStatus.Dead;
                }
                else
                {
                    proxy.Status = ProxyStatus.Degraded;
                }
            }
        }

        public async Task<T> ExecuteWithFailoverAsync<T>(Func<ProxyNode, Task<T>> operation, int maxRetries = 3)
        {
            int attempts = 0;
            Exception? lastEx = null;

            while (attempts < maxRetries)
            {
                attempts++;
                var proxy = GetNextHealthyProxy();
                if (proxy == null)
                {
                    throw new InvalidOperationException("[ProxyPool] Không còn Proxy nào hoạt động trong danh sách.");
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    var result = await operation(proxy).ConfigureAwait(false);
                    sw.Stop();
                    ReportSuccess(proxy.Id, sw.ElapsedMilliseconds);
                    return result;
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    lastEx = ex;
                    ReportFailure(proxy.Id);
                }
            }

            throw new InvalidOperationException($"[ProxyPool Failover] Tác vụ thất bại sau {maxRetries} lần thử lại với các Proxy khác nhau. Lỗi cuối: {lastEx?.Message}", lastEx);
        }

        public async Task RefreshPoolHealthAsync(CancellationToken cancellationToken = default)
        {
            var allProxies = GetAllProxies();
            var results = await _healthChecker.BatchCheckHealthAsync(allProxies, cancellationToken).ConfigureAwait(false);

            foreach (var res in results)
            {
                if (_proxies.TryGetValue(res.ProxyId, out var proxy))
                {
                    proxy.LastCheckedAt = DateTime.UtcNow;
                    if (res.IsAlive)
                    {
                        proxy.Status = ProxyStatus.Active;
                        proxy.LatencyMs = res.LatencyMs;
                        proxy.ExitIp = res.ExitIp;
                        proxy.ConsecutiveFailures = 0;
                    }
                    else
                    {
                        ReportFailure(proxy.Id);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Service quản lý Session, Cookies và User-Agent cô lập cho từng tài khoản mạng xã hội
    /// </summary>
    public class SocialAccountSessionManager
    {
        private readonly ConcurrentDictionary<string, SocialAccountSession> _sessions = new();

        public SocialAccountSession RegisterAccountSession(
            string accountId,
            SocialPlatform platform,
            string username,
            Dictionary<string, string>? cookies = null,
            string? assignedProxyId = null)
        {
            var session = new SocialAccountSession
            {
                AccountId = accountId,
                Platform = platform,
                Username = username,
                Cookies = cookies ?? new Dictionary<string, string>(),
                AssignedProxyId = assignedProxyId,
                Fingerprint = GenerateIsolatedFingerprint(accountId),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            };

            _sessions[accountId] = session;
            return session;
        }

        public SocialAccountSession? GetSession(string accountId)
        {
            _sessions.TryGetValue(accountId, out var session);
            return session;
        }

        public void UpdateCookies(string accountId, Dictionary<string, string> newCookies)
        {
            if (_sessions.TryGetValue(accountId, out var session))
            {
                foreach (var kvp in newCookies)
                {
                    session.Cookies[kvp.Key] = kvp.Value;
                }
                session.LastActiveAt = DateTime.UtcNow;
            }
        }

        public Dictionary<string, string> GetIsolatedRequestHeaders(string accountId)
        {
            if (!_sessions.TryGetValue(accountId, out var session))
            {
                throw new KeyNotFoundException($"[SessionManager] Không tìm thấy phiên làm việc cho Account ID: {accountId}");
            }

            var fp = session.Fingerprint;
            string cookieHeader = string.Join("; ", session.Cookies.Select(c => $"{Uri.EscapeDataString(c.Key)}={Uri.EscapeDataString(c.Value)}"));

            var headers = new Dictionary<string, string>
            {
                { "User-Agent", fp.UserAgent },
                { "Sec-Ch-Ua", fp.SecChUa },
                { "Accept-Language", fp.AcceptLanguage },
                { "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" },
                { "Sec-Fetch-Dest", "document" },
                { "Sec-Fetch-Mode", "navigate" },
                { "Sec-Fetch-Site", "none" },
                { "Sec-Fetch-User", "?1" }
            };

            if (!string.IsNullOrEmpty(cookieHeader))
            {
                headers["Cookie"] = cookieHeader;
            }

            return headers;
        }

        private static BrowserFingerprint GenerateIsolatedFingerprint(string accountId)
        {
            int hash = Math.Abs(accountId.GetHashCode());

            string[] userAgents = new[]
            {
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
            };

            return new BrowserFingerprint
            {
                UserAgent = userAgents[hash % userAgents.Length],
                SecChUa = "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
                AcceptLanguage = "en-US,en;q=0.9,vi;q=0.8",
                ViewportWidth = (hash % 2 == 0) ? 1920 : 1536,
                ViewportHeight = (hash % 2 == 0) ? 1080 : 864,
                DeviceMemoryGb = (hash % 2 == 0) ? 8 : 16,
                HardwareConcurrency = (hash % 2 == 0) ? 8 : 12
            };
        }
    }
}
