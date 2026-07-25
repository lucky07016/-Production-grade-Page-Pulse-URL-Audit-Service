const ipMap = new Map();

export function createRateLimiter(limit = 30, windowMs = 60000) {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipMap.entries()) {
      const filtered = timestamps.filter(t => now - t < windowMs);
      if (filtered.length === 0) {
        ipMap.delete(ip);
      } else {
        ipMap.set(ip, filtered);
      }
    }
  }, windowMs);

  if (interval.unref) {
    interval.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (!ipMap.has(ip)) {
      ipMap.set(ip, []);
    }

    const timestamps = ipMap.get(ip);
    const activeTimestamps = timestamps.filter(t => now - t < windowMs);

    if (activeTimestamps.length >= limit) {
      const oldestTimestamp = activeTimestamps[0];
      const resetTime = oldestTimestamp + windowMs;
      const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
          details: { retryAfterSeconds }
        }
      });
    }

    activeTimestamps.push(now);
    ipMap.set(ip, activeTimestamps);

    const remaining = limit - activeTimestamps.length;
    const resetTime = activeTimestamps[0] + windowMs;

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    next();
  };
}

// Export for testing purposes
export function clearRateLimiterMap() {
  ipMap.clear();
}
