const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

/* ---------------- Security & parsing ---------------- */
app.use(
  helmet({
    // Allow other origins (e.g. the Vite dev server) to load uploaded images.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Posts/avatars may use https image URLs; uploads are same-origin.
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS: set CLIENT_URL (comma-separated list) in production to lock this down.
const allowedOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true, // reflect origin when unrestricted (dev/demo)
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

/* ---------------- Static uploads ---------------- */
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', immutable: true })
);

/* ---------------- API ---------------- */
app.use('/api', apiLimiter, routes);

/* ---------------- Client (production) ----------------
 * If the React client has been built (client/dist), serve it from the same
 * Express process — one port serves both API and UI (single-origin deployment).
 */
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: let client-side routing own every non-API, non-upload path.
  app.get(/^(?!\/(api|uploads)\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

/* ---------------- Errors ---------------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
