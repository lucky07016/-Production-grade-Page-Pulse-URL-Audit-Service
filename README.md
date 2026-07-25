# Page Pulse ⚡

Page Pulse is a production-grade URL-audit service designed to fetch target web pages and analyze their loading speed, HTTP response headers, structural DOM elements (links, images, scripts), and SEO/OpenGraph metadata.

It is built with a **Node.js/Express** backend and a **React + Vite** frontend styled with premium custom Vanilla CSS.

---

## Features

- **Production-grade Auditing:** Validates URLs, fetches HTML, measures page response times, and extracts page size and header data.
- **HTML Metadata Parsing:** Extracts title, description, and OpenGraph (OG) properties (title, description, and preview image).
- **In-Memory TTL Caching:** Prevents redundant requests by serving recent audits of the same URL from cache (configurable window).
- **Sliding-Window Rate Limiting:** Enforces client limit policies with proper rate limit headers.
- **Structured JSON Logging:** Assigns a unique UUID to each request and outputs logs in production-grade JSON format.
- **Request Timeout:** Employs `AbortController` to abort slow queries exceeding the 5-second threshold.
- **Concurrency Limit:** Uses an in-memory queue to limit outgoing requests to a maximum of 5 concurrent processes.

---

## Installation & Setup

1. **Clone or copy the directory** to your local environment.
2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Running the Application

### 1. Development Mode (Runs Frontend & Backend Concurrently)
To run both the Vite dev server and Express backend server together:
```bash
npm run dev
```
- Frontend will be available at: [http://localhost:5173](http://localhost:5173)
- Express API server will run on: [http://localhost:5000](http://localhost:5000)

### 2. Production Mode (Builds Frontend & Serves via Express)
To build the React assets and run the Express production server:
```bash
npm run build
npm run start
```
The unified application will serve on: [http://localhost:5000](http://localhost:5000)

### 3. Running Tests
To run the automated Vitest test suite:
```bash
npm run test
```

---

## API Contract (Endpoints)

### 1. Audit URL
Run a structured performance and metadata audit for a given URL.

* **Endpoint:** `POST /api/audit`
* **Rate Limit:** 30 requests/minute per client IP.
* **Payload:**
  ```json
  {
    "url": "https://example.com",
    "cacheWindowMs": 30000
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "url": "https://example.com",
    "status": 200,
    "statusText": "OK",
    "responseTimeMs": 145,
    "sizeKB": 12.5,
    "isHttps": true,
    "headers": {
      "server": "ECS (sjc/F0A6)",
      "contentType": "text/html; charset=UTF-8",
      "contentLength": "1256",
      "cacheControl": "max-age=604800"
    },
    "metadata": {
      "title": "Example Domain",
      "description": "Example description...",
      "ogTitle": "",
      "ogDescription": "",
      "ogImage": "",
      "linksCount": 1,
      "imagesCount": 0,
      "scriptsCount": 0
    },
    "timestamp": "2026-07-25T08:00:00.000Z",
    "fromCache": false
  }
  ```

* **Error Responses:**
  * **400 Bad Request (Invalid/Missing URL):**
    ```json
    {
      "error": {
        "code": "INVALID_URL",
        "message": "URL protocol must be http or https"
      }
    }
    ```
  * **429 Too Many Requests (Rate Limit Exceeded):**
    ```json
    {
      "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests. Please try again in 58 seconds.",
        "details": {
          "retryAfterSeconds": 58
        }
      }
    }
    ```
  * **504 Gateway Timeout (Audit Request Timed Out):**
    ```json
    {
      "error": {
        "code": "REQUEST_TIMEOUT",
        "message": "Request to https://example.com timed out after 5000ms"
      }
    }
    ```

### 2. Clear Cache
Flush the memory cache.

* **Endpoint:** `POST /api/cache/clear`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Audit cache cleared successfully."
  }
  ```
