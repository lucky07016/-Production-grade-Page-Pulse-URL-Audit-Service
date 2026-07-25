import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { structuredLogger } from './middleware/logger.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { performAudit } from './services/audit.js';
import { auditCache } from './services/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(structuredLogger);

// Rate limiter: Max 30 requests per minute
const apiRateLimiter = createRateLimiter(30, 60000);

app.post('/api/audit', apiRateLimiter, async (req, res) => {
  const { url, cacheWindowMs } = req.body;

  if (!url) {
    return res.status(400).json({
      error: {
        code: 'MISSING_URL',
        message: 'The url field is required.'
      }
    });
  }

  // Cache configuration window: default to 30000ms (30s) if not specified or invalid, range [0, 3600000]
  let ttl = 30000;
  if (cacheWindowMs !== undefined) {
    const parsedTtl = parseInt(cacheWindowMs);
    if (!isNaN(parsedTtl) && parsedTtl >= 0) {
      ttl = parsedTtl;
    }
  }

  try {
    // Check Cache
    const cachedResult = auditCache.get(url);
    if (cachedResult && ttl > 0) {
      return res.json({
        ...cachedResult,
        fromCache: true
      });
    }

    // Perform Audit
    const result = await performAudit(url);

    // Save to Cache if ttl > 0
    if (ttl > 0) {
      auditCache.set(url, result, ttl);
    }

    return res.json({
      ...result,
      fromCache: false
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during the audit.',
        details: err.details || null
      }
    });
  }
});

// Cache clearing endpoint
app.post('/api/cache/clear', (req, res) => {
  auditCache.clear();
  return res.json({ success: true, message: 'Audit cache cleared successfully.' });
});

// Serve frontend assets in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to React index.html for SPAs
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist (e.g. before build), bypass and don't crash
      res.status(404).send('Frontend not built. Run npm run build first.');
    }
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Page Pulse backend server running on port ${PORT}`
    }));
  });
}

export default app;
