import { auditQueue } from './queue.js';

export function validateUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string' };
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL protocol must be http or https' };
    }
    return { isValid: true, parsed };
  } catch {
    return { isValid: false, error: 'Invalid URL structure' };
  }
}

function parseHTMLMetadata(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : '';

  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';

  const linksCount = (html.match(/<a\s+/gi) || []).length;
  const imagesCount = (html.match(/<img\s+/gi) || []).length;
  const scriptsCount = (html.match(/<script\s+/gi) || []).length;

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    linksCount,
    imagesCount,
    scriptsCount
  };
}

export async function performAudit(urlStr, timeoutMs = 5000) {
  const { isValid, error, parsed } = validateUrl(urlStr);
  if (!isValid) {
    throw {
      statusCode: 400,
      code: 'INVALID_URL',
      message: error
    };
  }

  // Wrap in queue execution to respect concurrency limit
  return auditQueue.run(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = process.hrtime();
    try {
      const response = await fetch(urlStr, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PagePulse-AuditService/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timeoutId);
      const diff = process.hrtime(startTime);
      const durationMs = Math.round(diff[0] * 1e3 + diff[1] * 1e-6);

      const contentType = response.headers.get('content-type') || '';
      let metadata = {};
      let html = '';

      if (contentType.includes('text/html')) {
        html = await response.text();
        metadata = parseHTMLMetadata(html);
      }

      // Check header properties
      const headers = {
        server: response.headers.get('server') || 'Unknown',
        contentType,
        contentLength: response.headers.get('content-length') || html.length.toString(),
        cacheControl: response.headers.get('cache-control') || 'none',
      };

      const sizeBytes = parseInt(headers.contentLength) || html.length || 0;
      const sizeKB = parseFloat((sizeBytes / 1024).toFixed(2));

      return {
        url: urlStr,
        status: response.status,
        statusText: response.statusText,
        responseTimeMs: durationMs,
        sizeKB,
        isHttps: parsed.protocol === 'https:',
        headers,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw {
          statusCode: 504,
          code: 'REQUEST_TIMEOUT',
          message: `Request to ${urlStr} timed out after ${timeoutMs}ms`
        };
      }

      // Handle common DNS/network/SSL errors
      const errMessage = err.message || '';
      let code = 'NETWORK_ERROR';
      let statusCode = 502;

      if (errMessage.includes('ENOTFOUND') || errMessage.includes('getaddrinfo')) {
        code = 'DNS_LOOKUP_FAILED';
        statusCode = 404;
      } else if (errMessage.includes('ECONNREFUSED')) {
        code = 'CONNECTION_REFUSED';
      } else if (errMessage.includes('self signed') || errMessage.includes('expired') || errMessage.includes('CERT_')) {
        code = 'SSL_HANDSHAKE_FAILED';
      }

      throw {
        statusCode,
        code,
        message: `Failed to fetch target URL: ${errMessage || err.toString()}`
      };
    }
  });
}
