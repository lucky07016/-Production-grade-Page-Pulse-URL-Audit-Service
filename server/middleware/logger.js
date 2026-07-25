import crypto from 'crypto';

export function structuredLogger(req, res, next) {
  const reqId = crypto.randomUUID();
  req.id = reqId;

  const startTime = process.hrtime();

  const reqLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    reqId,
    type: 'request_start',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  };
  console.log(JSON.stringify(reqLog));

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const resLog = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      reqId,
      type: 'request_end',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs),
    };
    console.log(JSON.stringify(resLog));
  });

  next();
}
