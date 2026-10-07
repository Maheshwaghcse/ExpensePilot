const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const policyRoutes = require('./routes/policyRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const fraudRoutes = require('./routes/fraudRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Trust reverse proxies (Vercel, Render, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local receipt images in the frontend
}));

// CORS Configuration (Dynamically allow localhost, Vercel deployments, Render, and configured URL)
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.indexOf(cleanOrigin) !== -1 ||
      cleanOrigin.startsWith('http://localhost:') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation for origin: ${origin}`), false);
  },
  credentials: true
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Request Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Inline Cookie Parser (Avoids external dependency)
app.use((req, res, next) => {
  req.cookies = {};
  const rawCookieHeader = req.headers.cookie;
  if (rawCookieHeader) {
    const rawCookies = rawCookieHeader.split(';');
    for (const cookie of rawCookies) {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=');
      req.cookies[name] = decodeURIComponent(value);
    }
  }
  next();
});

// Favicon 204 Handler (Prevents 404 browser console logs)
app.get(['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (req, res) => res.status(204).end());

// Root API Welcome & Health Check Routes (Fixes 404 when visiting Render URL directly)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'ExpensePilot Express Backend Service is live & healthy.',
    version: '1.0.0',
    endpoints: '/api/v1'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Static files route for uploaded receipt PDFs and images
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
if (process.env.VERCEL) {
  app.use('/uploads', express.static('/tmp'));
}

// API Routes mounting (Supports /api/v1/*, /api/*, and root /* for flexible deployment on Render/Vercel)
const routes = [
  { path: '/auth', router: authRoutes },
  { path: '/users', router: userRoutes },
  { path: '/departments', router: departmentRoutes },
  { path: '/policies', router: policyRoutes },
  { path: '/expenses', router: expenseRoutes },
  { path: '/receipts', router: receiptRoutes },
  { path: '/fraud', router: fraudRoutes },
  { path: '/dashboards', router: dashboardRoutes },
  { path: '/notifications', router: notificationRoutes }
];

routes.forEach(({ path, router }) => {
  app.use(`/api/v1${path}`, router);
  app.use(`/api${path}`, router);
  app.use(`${path}`, router);
});

// 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl} - Resource not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Express Error Handler] ${err.stack}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
