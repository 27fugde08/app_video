/**
 * CreatorOS - Desktop IPC & Local REST Backend Server
 * 
 * High-performance, lightweight local daemon providing hardware telemetry,
 * batch video processing, and real-time progress synchronization (SSE/WebSocket skeleton).
 */

import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { pluginLoader } from './core/pluginLoader.js';
import { logger } from './services/logger.service.js';

// Route Handlers
import downloaderRoutes from './routes/downloader.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import aiRoutes from './routes/ai.routes.js';
import vaultRoutes from './routes/vault.routes.js';
import dubbingRoutes from './routes/dubbing.routes.js';
import aiKeyRoutes from './routes/aiKey.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import videoJobRoutes from './routes/videoJob.routes.js';
import { cleanupStaleWorkspaces } from './core/tempManager/tempCleaner.js';
import { renderQueue } from './core/messageQueue.js';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server wrapper for future WebSocket/IPC integration
const server = http.createServer(app);

// SSE (Server-Sent Events) Clients pool for real-time download & hardware progress
const sseClients = new Set();

/**
 * Broadcast event to all connected desktop frontend listeners
 * @param {string} eventName 
 * @param {object} payload 
 */
export const broadcastEvent = (eventName, payload) => {
  const dataString = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch {
      sseClients.delete(client);
    }
  }
};

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      logger.info('HTTP_INCOMING', `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// SSE Real-time Progress Endpoint for Desktop UI
app.get('/api/events', (req, res) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  logger.info('IPC_BRIDGE', `UI Renderer client connected [${clientId}] via SSE`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, status: 'connected', time: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
    logger.clientDisconnect(clientId, 'UI window closed or refreshed connection');
  });
});

// Root Ultra-lightweight Heartbeat & Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    healthy: true,
    uptimeSeconds: Math.floor(process.uptime()),
    activeSSEClients: sseClients.size,
    memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    timestamp: new Date().toISOString()
  });
});

// Diagnostic Logs Route
app.get('/api/logs', (req, res) => {
  const count = parseInt(req.query.count, 10) || 50;
  const recentLogs = logger.getRecentLogs(count);
  res.status(200).json({
    success: true,
    count: recentLogs.length,
    logs: recentLogs
  });
});

// Root IPC Status Route
app.get('/api/status', (req, res) => {
  res.json({
    app: 'CreatorOS Desktop IPC Backend',
    version: '1.0.0',
    port: PORT,
    status: 'online',
    activeSSEClients: sseClients.size,
    timestamp: new Date().toISOString(),
    plugins: pluginLoader.getStatus()
  });
});

// Mount Feature Routes
app.use('/api/downloader', downloaderRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/dubbing', dubbingRoutes);
app.use('/api/ai-keys', aiKeyRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/v1/jobs', videoJobRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.url}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[IPC Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Daemon Server
server.listen(PORT, HOST, () => {
  console.log('\n======================================================');
  console.log(`  🚀 CreatorOS Desktop Backend Daemon`);
  console.log(`  🌐 HTTP & SSE IPC Endpoint: http://${HOST}:${PORT}`);
  console.log(`  📦 Plugin Core: Lazy-Loading Mode (FFmpeg, Python, AI)`);
  console.log(`  ⚡ Ready to handle desktop RPC / HTTP connections`);
  console.log('======================================================\n');
  // Safe Disk Hygiene: Sweep stale /tmp workspaces on boot
  cleanupStaleWorkspaces().catch(() => {});
});

// Graceful Shutdown
const shutdown = () => {
  console.log('\n[IPC Daemon] Shutting down gracefully...');
  pluginLoader.garbageCollect(0);
  server.close(() => {
    console.log('[IPC Daemon] Closed all active connections. Exited.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
