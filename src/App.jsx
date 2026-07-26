import React, { useState } from 'react';
import Footer from './components/Footer';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : '';

export default function App() {
  const [url, setUrl] = useState('');
  const [cacheWindowMs, setCacheWindowMs] = useState(30000);
  const [showConfig, setShowConfig] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cacheMsg, setCacheMsg] = useState('');
  
  const [rateLimit, setRateLimit] = useState({
    limit: '-',
    remaining: '-',
    reset: null
  });

  const handleAudit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCacheMsg('');

    // Prepend protocol if user enters bare domain
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      const response = await fetch(`${API_BASE}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: finalUrl,
          cacheWindowMs: Number(cacheWindowMs),
        }),
      });

      // Update rate limits from response headers
      const limit = response.headers.get('X-RateLimit-Limit') || '-';
      const remaining = response.headers.get('X-RateLimit-Remaining') || '-';
      const reset = response.headers.get('X-RateLimit-Reset');
      setRateLimit({ limit, remaining, reset });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to perform audit');
      }

      setResult(data);
    } catch (err) {
      setError({
        message: err.message || 'An error occurred during communication with the server.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cache/clear`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setCacheMsg('Cache successfully cleared!');
        setTimeout(() => setCacheMsg(''), 3000);
      }
    } catch {
      setCacheMsg('Failed to clear cache.');
    }
  };

  // Performance rating calculations
  const getPerformanceColor = (timeMs) => {
    if (timeMs < 300) return 'var(--success)';
    if (timeMs < 1000) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getPerformanceLabel = (timeMs) => {
    if (timeMs < 300) return 'Excellent';
    if (timeMs < 1000) return 'Moderate';
    return 'Poor';
  };

  // Gauge setup
  const responseTimeVal = result?.responseTimeMs || 0;
  const maxGaugeVal = 2000;
  const gaugePercent = Math.min(100, (responseTimeVal / maxGaugeVal) * 100);
  const strokeDashoffset = 440 - (440 * gaugePercent) / 100;

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <div className="logo-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1>Page Pulse</h1>
        </div>
        <p className="subtitle">
          Analyze web performance, security, SEO tags, and response metrics instantly with a production-grade audit engine.
        </p>
      </header>

      <main>
        <div className="panel audit-form-container">
          <form onSubmit={handleAudit} className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Enter URL to audit (e.g. google.com or http://example.com)..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="url-input"
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="btn-audit" disabled={loading}>
              {loading ? (
                <>
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                  Auditing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Run Audit
                </>
              )}
            </button>
          </form>

          <button 
            onClick={() => setShowConfig(!showConfig)} 
            className="config-trigger"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Configure Settings {showConfig ? '▲' : '▼'}
          </button>

          {showConfig && (
            <div className="config-panel">
              <div className="config-item">
                <label>Cache Duration (TTL)</label>
                <select 
                  value={cacheWindowMs} 
                  onChange={(e) => setCacheWindowMs(Number(e.target.value))}
                >
                  <option value="0">Disabled (Audit fresh every time)</option>
                  <option value="10000">10 Seconds</option>
                  <option value="30000">30 Seconds</option>
                  <option value="60000">1 Minute</option>
                  <option value="300000">5 Minutes</option>
                </select>
              </div>

              <div className="config-item" style={{ justifyContent: 'center' }}>
                <button 
                  onClick={handleClearCache} 
                  className="btn-clear-cache"
                >
                  Clear Active Cache
                </button>
                {cacheMsg && <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.4rem' }}>{cacheMsg}</p>}
              </div>

              <div className="config-item" style={{ flexGrow: 2 }}>
                <label>Client Rate Limits (My IP Address)</label>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Calls Remaining: <strong style={{ color: rateLimit.remaining === 0 ? 'var(--danger)' : 'var(--success)' }}>{rateLimit.remaining}</strong> / {rateLimit.limit}</span>
                  {rateLimit.reset && <span>Resets: {new Date(rateLimit.reset * 1000).toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div className="alert-title">Audit Failed</div>
              <div className="alert-message">{error.message}</div>
            </div>
          </div>
        )}

        {result && (
          <div className="dashboard-grid">
            <div className="col-full">
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-icon" style={{ background: result.status >= 400 ? 'var(--danger-glow)' : 'var(--success-glow)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={result.status >= 400 ? 'var(--danger)' : 'var(--success)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">HTTP Status</span>
                    <span className="metric-value" style={{ color: result.status >= 400 ? 'var(--danger)' : 'var(--success)' }}>
                      {result.status} {result.statusText}
                    </span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'var(--primary-glow)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Response Time</span>
                    <span className="metric-value">{result.responseTimeMs} ms</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: 'var(--secondary-glow)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">HTML Page Size</span>
                    <span className="metric-value">{result.sizeKB} KB</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon" style={{ background: result.fromCache ? 'var(--warning-glow)' : 'rgba(255, 255, 255, 0.05)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={result.fromCache ? 'var(--warning)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Cache Status</span>
                    <span className="metric-value" style={{ color: result.fromCache ? 'var(--warning)' : 'var(--text-secondary)' }}>
                      {result.fromCache ? 'Cached Result' : 'Fresh Audit'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Gauge */}
            <div className="col-4">
              <div className="panel gauge-panel">
                <span className="result-section-title">Speed Score</span>
                <div className="gauge-container">
                  <svg className="gauge-svg" viewBox="0 0 160 160">
                    <circle className="gauge-bg" cx="80" cy="80" r="70" />
                    <circle 
                      className="gauge-fill" 
                      cx="80" 
                      cy="80" 
                      r="70"
                      stroke={getPerformanceColor(responseTimeVal)}
                      strokeDasharray="440"
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="gauge-center">
                    <span className="gauge-number" style={{ color: getPerformanceColor(responseTimeVal) }}>
                      {responseTimeVal}
                    </span>
                    <span className="gauge-unit">ms</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="badge" style={{
                    background: `${getPerformanceColor(responseTimeVal)}20`,
                    color: getPerformanceColor(responseTimeVal),
                    border: `1px solid ${getPerformanceColor(responseTimeVal)}40`
                  }}>
                    {getPerformanceLabel(responseTimeVal)}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.4' }}>
                    Response completed in {responseTimeVal}ms. Targets below 300ms provide an optimal experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Content & Metadata */}
            <div className="col-8">
              <div className="panel" style={{ height: '100%' }}>
                <span className="result-section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Page Metadata (SEO & OpenGraph)
                </span>
                
                {result.headers.contentType?.includes('text/html') ? (
                  <div className="meta-grid">
                    <div className="meta-field col-full">
                      <div className="meta-field-label">Page Title</div>
                      <div className={`meta-field-value ${!result.metadata.title ? 'empty' : ''}`}>
                        {result.metadata.title || 'No Title Tag Found'}
                      </div>
                    </div>

                    <div className="meta-field col-full">
                      <div className="meta-field-label">Description</div>
                      <div className={`meta-field-value ${!result.metadata.description ? 'empty' : ''}`}>
                        {result.metadata.description || 'No Meta Description Found'}
                      </div>
                    </div>

                    <div className="meta-field">
                      <div className="meta-field-label">OG Title</div>
                      <div className={`meta-field-value ${!result.metadata.ogTitle ? 'empty' : ''}`}>
                        {result.metadata.ogTitle || 'No og:title Found'}
                      </div>
                    </div>

                    <div className="meta-field">
                      <div className="meta-field-label">OG Description</div>
                      <div className={`meta-field-value ${!result.metadata.ogDescription ? 'empty' : ''}`}>
                        {result.metadata.ogDescription || 'No og:description Found'}
                      </div>
                    </div>

                    {result.metadata.ogImage && (
                      <div className="meta-field col-full">
                        <div className="meta-field-label">OG Image (Preview)</div>
                        <div style={{ marginTop: '0.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '200px' }}>
                          <img 
                            src={result.metadata.ogImage} 
                            alt="Open Graph Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                    Metadata is only available for HTML documents. (Content Type: {result.headers.contentType})
                  </div>
                )}
              </div>
            </div>

            {/* Element Counts */}
            {result.headers.contentType?.includes('text/html') && (
              <div className="col-6">
                <div className="panel">
                  <span className="result-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    DOM Structure Analyzer
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Hyperlinks (&lt;a&gt; tags)</span>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{result.metadata.linksCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Images (&lt;img&gt; tags)</span>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{result.metadata.imagesCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Scripts (&lt;script&gt; tags)</span>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{result.metadata.scriptsCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HTTPS & Server Details */}
            <div className={result.headers.contentType?.includes('text/html') ? 'col-6' : 'col-full'}>
              <div className="panel">
                <span className="result-section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Security & Server Identity
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>HTTPS / SSL Status</span>
                    <span className={`badge ${result.isHttps ? 'badge-success' : 'badge-danger'}`}>
                      {result.isHttps ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          Encrypted (SSL)
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                          </svg>
                          Insecure (HTTP)
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Target Web Server</span>
                    <strong>{result.headers.server}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Audit Timestamp</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* HTTP Headers */}
            <div className="col-full">
              <div className="panel">
                <span className="result-section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                    <line x1="10" y1="3" x2="8" y2="21" />
                    <line x1="16" y1="3" x2="14" y2="21" />
                  </svg>
                  Selected Response Headers
                </span>
                
                <div className="headers-list">
                  <div className="header-row">
                    <span className="header-name">Content-Type</span>
                    <span className="header-val">{result.headers.contentType}</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Content-Length (Raw bytes)</span>
                    <span className="header-val">{result.headers.contentLength}</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Cache-Control</span>
                    <span className="header-val">{result.headers.cacheControl}</span>
                  </div>
                  <div className="header-row">
                    <span className="header-name">Server</span>
                    <span className="header-val">{result.headers.server}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
