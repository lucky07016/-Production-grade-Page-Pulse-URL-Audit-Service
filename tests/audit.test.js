import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server/index.js';
import { auditCache } from '../server/services/cache.js';
import { clearRateLimiterMap } from '../server/middleware/rateLimiter.js';

describe('Page Pulse API', () => {
  beforeEach(() => {
    auditCache.clear();
    clearRateLimiterMap();
    vi.restoreAllMocks();
  });

  describe('POST /api/audit', () => {
    it('should validate missing URL', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_URL');
    });

    it('should validate invalid URL structure', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({ url: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });

    it('should validate unsupported protocols', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({ url: 'ftp://example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });

    it('should audit valid URLs and return structured data', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="A test description">
            <meta property="og:title" content="OG Test Page">
          </head>
          <body>
            <a href="/link1">Link 1</a>
            <img src="img1.png" />
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => {
            const headers = {
              'content-type': 'text/html; charset=utf-8',
              'server': 'TestServer',
              'content-length': mockHtml.length.toString(),
            };
            return headers[name.toLowerCase()] || null;
          }
        },
        text: async () => mockHtml,
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/audit')
        .send({ url: 'https://example.com', cacheWindowMs: 30000 });

      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(res.body.fromCache).toBe(false);
      expect(res.body.status).toBe(200);
      expect(res.body.isHttps).toBe(true);
      expect(res.body.headers.server).toBe('TestServer');
      expect(res.body.metadata.title).toBe('Test Page');
      expect(res.body.metadata.description).toBe('A test description');
      expect(res.body.metadata.ogTitle).toBe('OG Test Page');
      expect(res.body.metadata.linksCount).toBe(1);
      expect(res.body.metadata.imagesCount).toBe(1);
    });

    it('should serve from cache on repeated requests within TTL window', async () => {
      const mockHtml = '<html><head><title>Cached Page</title></head></html>';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => {
            const headers = {
              'content-type': 'text/html',
              'server': 'TestServer',
            };
            return headers[name.toLowerCase()] || null;
          }
        },
        text: async () => mockHtml,
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

      const res1 = await request(app)
        .post('/api/audit')
        .send({ url: 'https://cache-test.com', cacheWindowMs: 30000 });

      expect(res1.status).toBe(200);
      expect(res1.body.fromCache).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const res2 = await request(app)
        .post('/api/audit')
        .send({ url: 'https://cache-test.com', cacheWindowMs: 30000 });

      expect(res2.status).toBe(200);
      expect(res2.body.fromCache).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle request timeout', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => {
        return new Promise((_, reject) => {
          const abortError = new Error('The user aborted a request.');
          abortError.name = 'AbortError';
          setTimeout(() => reject(abortError), 10);
        });
      });

      const res = await request(app)
        .post('/api/audit')
        .send({ url: 'https://slow-site.com' });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe('REQUEST_TIMEOUT');
    });

    it('should enforce rate limits and return 429 after exceeding limit', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => {
            const headers = { 'content-type': 'text/html' };
            return headers[name.toLowerCase()] || null;
          }
        },
        text: async () => '<html></html>',
      };
      vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/api/audit')
          .send({ url: `https://test-rate-${i}.com` });
      }

      const resRateLimited = await request(app)
        .post('/api/audit')
        .send({ url: 'https://test-rate-exceeded.com' });

      expect(resRateLimited.status).toBe(429);
      expect(resRateLimited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(resRateLimited.headers['retry-after']).toBeDefined();
    });
  });
});
