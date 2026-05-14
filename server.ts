import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import crypto from 'node:crypto';
import compression from 'compression';
import Stripe from 'stripe';
import { Server as SocketIOServer } from 'socket.io';
import PDFDocument from 'pdfkit';
import logger from './lib/logger.js';
import * as db from './lib/database.js';
import { initSentry, getSentryErrorHandler } from './lib/sentry.js';
import { initEmail, sendEmail, sendOrderConfirmation, sendOrderStatusUpdate } from './lib/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ── Config ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;

const io = new SocketIOServer(server, {
  cors: { origin: FRONTEND_URL, credentials: true },
  path: '/ws',
});

const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const COOKIE_SECRET: string = process.env.COOKIE_SECRET || 'dev-cookie-secret';

// Password segura: puede ser hash directo ($2b$) o texto plano
const ADMIN_PASSWORD: string = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_PASSWORD_IS_HASH = ADMIN_PASSWORD.startsWith('$2b$');

// IP whitelist opcional (separadas por coma)
const ADMIN_IP_WHITELIST: string[] = (process.env.ADMIN_IP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean);

// 2FA por email (opcional)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ── Stripe ───────────────────────────────────────────────────────────
let stripe: Stripe | null = null;
let maintenanceMode = false;
const sk: string = process.env.STRIPE_SECRET_KEY || '';
if (sk.startsWith('sk_') && !sk.includes('xxxxx')) {
  stripe = new Stripe(sk);
}

// ── Sentry (antes que Express) ──────────────────────────────────────
initSentry();

// ── Email ───────────────────────────────────────────────────────────
initEmail();

// ── In-memory stores ──────────────────────────────────────────────
const csrfTokens = new Map<string, string>();
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const sessionFingerprints = new Map<string, string>();

// ── DB ───────────────────────────────────────────────────────────────
db.init();
db.seedProducts();
db.seedPosts();

// ── Security middleware ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameAncestors: ["'none'"],
    },
  } : false,
}));

// ── Compression (gzip) ───────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 256 }));

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser(COOKIE_SECRET));

// ── Request logging ─────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      logger.info({ method: req.method, path: req.path, status: res.statusCode, ms }, 'request');
    }
  });
  next();
});

// ── Rate limiting ────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de acceso. Inténtalo en 15 minutos.' },
});
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos de pago. Espera un minuto.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/checkout', checkoutLimiter);

// ── CSRF ─────────────────────────────────────────────────────────────
const csrfExempt = ['/api/auth/login', '/api/csrf-token', '/api/webhook/stripe', '/api/health', '/api/coupons/validate', '/api/coupons/apply', '/api/customer/register', '/api/customer/login', '/api/newsletter/subscribe', '/api/tracking'];
app.use('/api/', (req, res, next) => {
  if (csrfExempt.some(p => req.originalUrl.startsWith(p))) return next();
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] as string | undefined;
    const sessionId = req.cookies?.session_id as string | undefined;
    if (!token || !sessionId || csrfTokens.get(sessionId) !== token) {
      res.status(403).json({ error: 'CSRF token inválido' });
      return;
    }
  }
  next();
});

// ── Static files con caché ──────────────────────────────────────────
const oneYear = 365 * 24 * 60 * 60 * 1000;
const oneHour = 60 * 60 * 1000;

// Assets con hash (inmutables, cache eterno)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {
  maxAge: oneYear,
  immutable: true,
}));

// Iconos y manifest (cambio poco frecuente)
app.use('/icons', express.static(path.join(__dirname, 'public', 'icons'), { maxAge: oneYear }));
app.get('/manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// HTML y otros archivos (sin caché o corto)
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  index: false,
  redirect: false,
  maxAge: NODE_ENV === 'production' ? oneHour : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    if (filePath.endsWith('.css') || filePath.endsWith('.js')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────
interface TokenPayload {
  role: string;
}

function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  const id = uuidv4();
  const token = jwt.sign({ ...payload, jti: id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  db.createRefreshToken(id, payload.role);
  return token;
}

function setAuthCookies(res: express.Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) { res.status(401).json({ error: 'TOKEN_MISSING' }); return; }
  try {
    const user = jwt.verify(token, JWT_SECRET) as TokenPayload;
    (req as any).user = user;

    // Session fingerprint validation
    const sessionId = req.cookies?.session_id as string | undefined;
    if (sessionId && sessionFingerprints.has(sessionId)) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const expected = crypto.createHash('sha256').update([req.headers['user-agent'] || '', ip].join('|')).digest('hex').slice(0, 16);
      const actual = sessionFingerprints.get(sessionId);
      if (expected !== actual) {
        sessionFingerprints.delete(sessionId);
        logger.warn({ ip }, 'Fingerprint mismatch — sesión invalidada');
        res.clearCookie('access_token', { path: '/' });
        res.status(401).json({ error: 'SESSION_HIJACK' });
        return;
      }
    }

    // Inactivity check (admin only)
    if (sessionId && sessionFingerprints.has(sessionId)) {
      if (isAdminSessionExpired(sessionId)) {
        logger.warn({ sessionId }, 'Sesión admin expirada por inactividad');
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth' });
        res.status(401).json({ error: 'SESSION_EXPIRED' });
        return;
      }
      touchAdminSession(sessionId);
    }

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') { res.status(401).json({ error: 'TOKEN_EXPIRED' }); return; }
    res.status(403).json({ error: 'TOKEN_INVALID' });
  }
}

// ── Admin security ───────────────────────────────────────────────────
const adminSessions = new Map<string, { lastActive: number }>();
const ADMIN_INACTIVITY_MS = 30 * 60 * 1000;
const adminWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'Demasiadas operaciones. Espera un minuto.' } });

function touchAdminSession(sessionId: string): void {
  adminSessions.set(sessionId, { lastActive: Date.now() });
}

function isAdminSessionExpired(sessionId: string): boolean {
  const s = adminSessions.get(sessionId);
  return !s || (Date.now() - s.lastActive > ADMIN_INACTIVITY_MS);
}

// ── Init admin ───────────────────────────────────────────────────────
const SALT_ROUNDS = 12;

async function initAdmin(): Promise<void> {
  const existing = db.getAdmin();
  if (existing) return;
  // Si la contraseña ya es un hash, la usamos directamente
  const hash = ADMIN_PASSWORD_IS_HASH ? ADMIN_PASSWORD : await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  db.createAdmin(hash);
  logger.info('Admin creado en base de datos');
}
await initAdmin();

// ── WebSocket (solo para admin autenticado) ──────────────────────────
const authenticatedSockets = new Set<string>();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split(';').find((c: string) => c.trim().startsWith('access_token='))?.split('=')[1];
    if (token) {
      jwt.verify(token, JWT_SECRET);
      return next();
    }
  } catch {}
  return next(new Error('Unauthorized'));
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Admin conectado vía WebSocket');
  authenticatedSockets.add(socket.id);
  socket.on('disconnect', () => {
    authenticatedSockets.delete(socket.id);
    logger.info({ socketId: socket.id }, 'Admin desconectado');
  });
});

function emitToAdmins(event: string, data: unknown): void {
  for (const sid of authenticatedSockets) {
    io.to(sid).emit(event, data);
  }
}

// ── Auth routes ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // ── IP Whitelist ───────────────────────────────────────────────
    if (ADMIN_IP_WHITELIST.length > 0 && !ADMIN_IP_WHITELIST.includes(ip)) {
      logger.warn({ ip }, 'Intento de acceso desde IP no autorizada');
      db.logAdminAction('login:blocked', `IP bloqueada: ${ip}`, ip);
      res.status(403).json({ error: 'Acceso denegado desde tu ubicación.' });
      return;
    }

    // ── Brute force check ──────────────────────────────────────────
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
      const elapsed = (now - attempt.lastAttempt) / 1000 / 60;
      if (elapsed < LOGIN_LOCKOUT_MINUTES) {
        const remaining = Math.ceil(LOGIN_LOCKOUT_MINUTES - elapsed);
        logger.warn({ ip }, `Bloqueado por ${remaining} min (${attempt.count} intentos)`);
        db.logAdminAction('login:locked', `IP bloqueada ${remaining}min tras ${attempt.count} intentos`, ip);
        res.status(429).json({ error: `Demasiados intentos. Intenta de nuevo en ${remaining} minutos.` });
        return;
      }
      loginAttempts.delete(ip);
    }

    const { password } = req.body;
    if (!password) { res.status(400).json({ error: 'Contraseña requerida' }); return; }

    const admin = db.getAdmin();
    if (!admin) { res.status(401).json({ error: 'Credenciales inválidas' }); return; }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      loginAttempts.set(ip, { count: (attempt?.count || 0) + 1, lastAttempt: now });
      logger.warn({ ip, attempts: (attempt?.count || 0) + 1 }, 'Login fallido');
      db.logAdminAction('login:failed', `Intento fallido #${(attempt?.count || 0) + 1} desde ${ip}`, ip);
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Login exitoso — resetear intentos
    loginAttempts.delete(ip);

    // ── 2FA por email (si está configurado) ────────────────────────
    if (ADMIN_EMAIL) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      // Guardar código temporal en sesión (expira en 5 min)
      // Por ahora, mostrar en consola
      logger.info({ code, email: ADMIN_EMAIL }, 'Código 2FA para admin');
      // En producción aquí enviarías el email
    }

    // ── Session fingerprint ────────────────────────────────────────
    const fingerprint = crypto.createHash('sha256').update([req.headers['user-agent'] || '', ip].join('|')).digest('hex').slice(0, 16);

    const payload: TokenPayload = { role: 'admin' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);
    const csrfToken = uuidv4();

    const sessionId = uuidv4();
    csrfTokens.set(sessionId, csrfToken);
    sessionFingerprints.set(sessionId, fingerprint);
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    setAuthCookies(res, accessToken, refreshToken);
    touchAdminSession(sessionId);

    // Audit log
    db.logAdminAction('login', `Login exitoso desde ${ip}`, ip);

    logger.info({ ip }, 'Login exitoso');
    res.json({ csrfToken });
  } catch (err) {
    logger.error({ err, path: '/api/auth/login' }, 'Error en login');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) { res.status(401).json({ error: 'REFRESH_MISSING' }); return; }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload & { jti: string };
    const stored = db.getRefreshToken(decoded.jti);
    if (!stored) { res.status(401).json({ error: 'REFRESH_INVALID' }); return; }

    db.deleteRefreshToken(decoded.jti);

    const payload: TokenPayload = { role: decoded.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'REFRESH_EXPIRED' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken) as { jti?: string } | null;
      if (decoded?.jti) db.deleteRefreshToken(decoded.jti);
    } catch { /* ignore */ }
  }
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('session_id', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// ── Customer auth ─────────────────────────────────────────────────────
function authenticateCustomer(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Token requerido' }); return; }
  try {
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET) as TokenPayload & { cid: string };
    (req as any).customerId = user.cid;
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
}

app.post('/api/customer/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 6) { res.status(400).json({ error: 'Email y contraseña (mín 6 caracteres) requeridos' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email inválido' }); return; }

    const hash = await bcrypt.hash(password, 10);
    const customer = db.createCustomer(email, hash, name || '');
    const token = jwt.sign({ role: 'customer', cid: customer.id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, customer: { id: customer.id, email: customer.email, name: customer.name } });
  } catch (err: any) {
    if (err?.code?.startsWith('SQLITE_CONSTRAINT')) { res.status(400).json({ error: 'Este email ya está registrado. ¿Olvidaste tu contraseña?' }); return; }
    logger.error({ err: err?.message || err, stack: err?.stack, path: '/api/customer/register' }, 'Error registering');
    res.status(500).json({ error: 'Error al crear cuenta: ' + (err?.message || 'error interno') });
  }
});

const customerAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } });
app.post('/api/customer/login', customerAuthLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email y contraseña requeridos' }); return; }

    const customer = db.getCustomerByEmail(email);
    if (!customer) { res.status(401).json({ error: 'Credenciales inválidas' }); return; }

    const match = await bcrypt.compare(password, customer.password);
    if (!match) { res.status(401).json({ error: 'Credenciales inválidas' }); return; }

    const token = jwt.sign({ role: 'customer', cid: customer.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, customer: { id: customer.id, email: customer.email, name: customer.name } });
  } catch (err) {
    logger.error({ err, path: '/api/customer/login' }, 'Error login');
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/api/customer/me', authenticateCustomer, (req, res) => {
  const customer = db.getCustomer((req as any).customerId);
  if (!customer) { res.status(401).json({ error: 'CLIENTE_NOT_FOUND', message: 'Tu usuario ya no existe. Es necesario registrarse de nuevo.' }); return; }
  res.json(customer);
});

app.get('/api/customer/orders', authenticateCustomer, (req, res) => {
  res.json(db.getOrdersByCustomer((req as any).customerId));
});

app.put('/api/customer/profile', authenticateCustomer, (req, res) => {
  try {
    const { name, default_addr, default_city, default_zip } = req.body;
    db.updateCustomer((req as any).customerId, { name, default_addr, default_city, default_zip });
    res.json(db.getCustomer((req as any).customerId));
  } catch (err) {
    logger.error({ err, path: '/api/customer/profile' }, 'Error updating');
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ── Checkout / Payment ───────────────────────────────────────────────
app.post('/api/checkout/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      res.status(200).json({ mode: 'demo', message: 'Pedido registrado (modo demo)' });
      return;
    }

    const { amount, currency, orderId } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Importe inválido' }); return; }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: orderId || uuidv4() },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    logger.error({ err, path: '/api/checkout/create-payment-intent' }, 'Error en Stripe');
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});

// Stripe webhook
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) { res.status(200).json({ received: true }); return; }

  const sig = req.headers['stripe-signature'] as string;
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;
    if (orderId) db.updateOrderStatus(orderId, 'paid');
  }

  res.json({ received: true });
});

// ── Orders API ───────────────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  try {
    const raw = req.body;
    if (!raw.name || !raw.email || !raw.address) { res.status(400).json({ error: 'Campos obligatorios: name, email, address' }); return; }

    // Sanitize inputs
    const name = String(raw.name).trim().slice(0, 100).replace(/<[^>]*>/g, '');
    const email = String(raw.email).trim().slice(0, 120).replace(/<[^>]*>/g, '');
    const address = String(raw.address).trim().slice(0, 200).replace(/<[^>]*>/g, '');
    const city = String(raw.city || '').trim().slice(0, 80).replace(/<[^>]*>/g, '');
    const zip = String(raw.zip || '').trim().slice(0, 10).replace(/<[^>]*>/g, '');
    const quantity = Math.min(Math.max(1, Number(raw.quantity) || 1), 100);
    const total = Math.min(Math.max(0, Number(raw.total) || 0), 99999);

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email inválido' }); return; }

    const order = db.createOrder({ name, email, address, city, zip, quantity, total });
    emitToAdmins('order:created', order);
    sendOrderConfirmation(order);
    res.status(201).json(order);
  } catch (err) {
    logger.error({ err, path: '/api/orders POST' }, 'Error creando pedido');
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
});

app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    res.json(db.getAllOrders());
  } catch (err) {
    logger.error({ err, path: '/api/orders GET' }, 'Error listando pedidos');
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    const status: string = req.body.status;
    const valid = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) { res.status(400).json({ error: 'Estado inválido' }); return; }

    const orderId: string = req.params.id as string;
    const order = db.updateOrderStatus(orderId, status);
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
    if (status !== 'pending') {
      emitToAdmins('order:updated', order);
      sendOrderStatusUpdate(order);
    }
    db.logAdminAction('order:status', `Pedido ${orderId.slice(0, 8)} → ${status}`, req.ip || '');
    res.json(order);
  } catch (err) {
    logger.error({ err, path: '/api/orders/:id/status' }, 'Error actualizando estado');
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// ── CSRF token for frontend ──────────────────────────────────────────
app.get('/api/csrf-token', (req, res) => {
  const token = uuidv4();
  const sessionId = (req.cookies?.session_id as string) || uuidv4();
  csrfTokens.set(sessionId, token);
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ csrfToken: token });
});

// ── Health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    res.json({
      status: 'ok',
      stripe: stripe ? 'connected' : 'demo',
      stripeKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      maintenance: maintenanceMode,
      orders: db.countOrders(),
      uptime: process.uptime(),
    });
  } catch {
    res.json({ status: 'error', message: 'Database unavailable' });
  }
});

// ── Orders statistics ────────────────────────────────────────────────
app.get('/api/orders/stats', authenticateToken, (req, res) => {
  try {
    const all = db.getAllOrders();
    const total = all.length;
    const revenue = all.reduce((s, o) => s + (o.status !== 'cancelled' ? o.total : 0), 0);
    const pending = all.filter(o => o.status === 'pending').length;
    const shipped = all.filter(o => ['shipped', 'delivered'].includes(o.status)).length;

    // Last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisWeek = all.filter(o => o.created >= weekAgo);

    res.json({ total, revenue, pending, shipped, thisWeek: thisWeek.length });
  } catch (err) {
    res.status(500).json({ error: 'Error getting stats' });
  }
});

// ── Export orders CSV ────────────────────────────────────────────────
app.get('/api/orders/export', authenticateToken, (req, res) => {
  try {
    const all = db.getAllOrders();
    const csv = [
      'ID,Cliente,Email,Dirección,Ciudad,CP,Cantidad,Total,Estado,Fecha',
      ...all.map(o =>
        `"${o.id}","${o.name}","${o.email}","${o.address}","${o.city}","${o.zip}",${o.quantity},${o.total},"${o.status}","${o.created}"`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'Error exporting CSV' });
  }
});

// ── PDF receipt ──────────────────────────────────────────────────────
app.get('/api/orders/:id/pdf', authenticateToken, (req, res) => {
  try {
    const order = db.getOrder(req.params.id as string);
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${order.id.slice(0, 8)}.pdf"`);
    doc.pipe(res);

    // Colors
    const gold = '#C9A84C';
    const dark = '#0A0A0F';
    const muted = '#666';

    doc.fontSize(24).font('Helvetica-Bold').fillColor(gold).text('LUMICHARGE', { continued: false });
    doc.fontSize(8).fillColor(muted).text('LumiCharge Technologies S.L. · CIF: B-12345678 · Madrid, España');
    doc.moveDown(1);

    doc.fontSize(16).fillColor(dark).text('FACTURA', { continued: false });
    doc.moveDown(0.5);

    // Details
    doc.fontSize(9).fillColor(muted);
    doc.text(`Pedido: #${order.id.slice(0, 8)}`);
    doc.text(`Fecha: ${new Date(order.created).toLocaleDateString('es-ES')}`);
    doc.text(`Cliente: ${order.name}`);
    doc.text(`Email: ${order.email}`);
    doc.text(`Dirección: ${order.address}, ${order.city} ${order.zip}`);
    doc.moveDown(1);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark);
    doc.text('Producto', 50, tableTop);
    doc.text('Cant.', 320, tableTop, { width: 40, align: 'center' });
    doc.text('Precio', 380, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 470, tableTop, { width: 70, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(540, doc.y + 5).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fillColor(dark);
    doc.text('LumiCharge Pro 50W', 50, doc.y);
    doc.text(String(order.quantity), 320, doc.y - 12, { width: 40, align: 'center' });
    doc.text(`€${order.total.toFixed(2)}`, 380, doc.y - 12, { width: 70, align: 'right' });
    doc.text(`€${(order.total / order.quantity).toFixed(2)}`, 470, doc.y - 12, { width: 70, align: 'right' });

    doc.moveDown(1.5);
    doc.moveTo(350, doc.y).lineTo(540, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fillColor(gold);
    doc.text('TOTAL:', 350, doc.y, { continued: false });
    doc.text(`€${order.total.toFixed(2)}`, 470, doc.y - 12, { width: 70, align: 'right' });

    doc.moveDown(3);
    doc.fontSize(7).fillColor(muted);
    doc.text('IVA incluido · Envío gratuito · Pago procesado por Stripe', { align: 'center' });
    doc.text('LumiCharge Technologies S.L. · Calle Gran Vía 28, 28013 Madrid', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

// ── Maintenance mode (admin only) ────────────────────────────────────
app.get('/api/admin/maintenance', authenticateToken, (req, res) => res.json({ maintenance: maintenanceMode }));
app.post('/api/admin/maintenance', authenticateToken, adminWriteLimiter, (req, res) => {
  maintenanceMode = !!req.body.enabled;
  db.logAdminAction('maintenance', maintenanceMode ? 'Activado' : 'Desactivado', req.ip || '');
  logger.info({ maintenance: maintenanceMode }, 'Modo mantenimiento cambiado');
  res.json({ maintenance: maintenanceMode });
});

// ── Admin audit log ──────────────────────────────────────────────────
app.get('/api/admin/audit', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(db.getAuditLog(limit));
  } catch { res.status(500).json({ error: 'Error al obtener auditoría' }); }
});

// ── Products API ─────────────────────────────────────────────────────
const productsLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Demasiadas peticiones' } });

app.get('/api/products', productsLimiter, (req, res) => {
  try {
    const includeInactive = req.query.all === '1';
    res.json(db.getAllProducts(includeInactive));
  } catch (err) {
    logger.error({ err, path: '/api/products GET' }, 'Error getting products');
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.getProduct(req.params.id as string);
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

app.post('/api/products', authenticateToken, (req, res) => {
  try {
    const raw = req.body;
    const name = String(raw.name || '').trim().slice(0, 100).replace(/<[^>]*>/g, '');
    const price = Number(raw.price);
    if (!name || isNaN(price) || price < 0 || price > 99999) { res.status(400).json({ error: 'Nombre y precio válidos requeridos' }); return; }

    const description = String(raw.description || '').trim().slice(0, 500).replace(/<[^>]*>/g, '');
    const image = String(raw.image || '📦').trim().slice(0, 10);
    const stock = Math.min(Math.max(0, Number(raw.stock) || 0), 99999);
    const category = String(raw.category || 'general').trim().slice(0, 50).replace(/<[^>]*>/g, '');

    const product = db.createProduct({ name, description, price, image, stock, category });
    res.status(201).json(product);
  } catch (err) {
    logger.error({ err, path: '/api/products POST' }, 'Error creating product');
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/api/products/:id', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    const raw = req.body;
    const sanitized: Record<string, unknown> = {};
    if (raw.name !== undefined) sanitized.name = String(raw.name).trim().slice(0, 100).replace(/<[^>]*>/g, '');
    if (raw.description !== undefined) sanitized.description = String(raw.description).trim().slice(0, 500).replace(/<[^>]*>/g, '');
    if (raw.price !== undefined) { const p = Number(raw.price); if (!isNaN(p) && p >= 0 && p <= 99999) sanitized.price = p; }
    if (raw.stock !== undefined) { const s = Number(raw.stock); if (!isNaN(s) && s >= 0 && s <= 99999) sanitized.stock = s; }
    if (raw.image !== undefined) sanitized.image = String(raw.image).trim().slice(0, 10);
    if (raw.category !== undefined) sanitized.category = String(raw.category).trim().slice(0, 50).replace(/<[^>]*>/g, '');
    if (raw.active !== undefined) sanitized.active = raw.active ? 1 : 0;

    const product = db.updateProduct(req.params.id as string, sanitized);
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    db.logAdminAction('product:update', `Producto ${product.name}`, req.ip || '');
    res.json(product);
  } catch (err) {
    logger.error({ err, path: '/api/products PUT' }, 'Error updating product');
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/api/products/:id', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    db.logAdminAction('product:delete', `ID: ${req.params.id.slice(0, 8)}`, req.ip || '');
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, path: '/api/products DELETE' }, 'Error deleting product');
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ── Coupons API ──────────────────────────────────────────────────────
app.get('/api/coupons', authenticateToken, (req, res) => {
  try { res.json(db.getAllCoupons()); }
  catch (err) { res.status(500).json({ error: 'Error al obtener cupones' }); }
});

app.post('/api/coupons', authenticateToken, (req, res) => {
  try {
    const { code, discount, type, min_amount, max_uses, expires_at } = req.body;
    const c = String(code || '').toUpperCase().trim();
    if (!c || !discount || discount <= 0) { res.status(400).json({ error: 'Código y descuento requeridos' }); return; }
    const d = Math.min(Number(discount), type === 'percentage' ? 100 : 99999);
    const coupon = db.createCoupon({ code: c, discount: d, type: type || 'percentage', min_amount: Number(min_amount) || 0, max_uses: Number(max_uses) || 0, expires_at });
    res.status(201).json(coupon);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT') { res.status(400).json({ error: 'Este código ya existe' }); return; }
    res.status(500).json({ error: 'Error al crear cupón' });
  }
});

app.put('/api/coupons/:id', authenticateToken, (req, res) => {
  try {
    const ok = db.updateCoupon(req.params.id as string, req.body);
    if (!ok) { res.status(404).json({ error: 'Cupón no encontrado' }); return; }
    res.json(db.getCoupon(req.params.id as string));
  } catch (err) { res.status(500).json({ error: 'Error al actualizar cupón' }); }
});

app.delete('/api/coupons/:id', authenticateToken, (req, res) => {
  try {
    if (!db.deleteCoupon(req.params.id as string)) { res.status(404).json({ error: 'Cupón no encontrado' }); return; }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar cupón' }); }
});

// ── Validate coupon (público, para el frontend) ─────────────────────
app.post('/api/coupons/validate', (req, res) => {
  try {
    const { code, total } = req.body;
    if (!code) { res.status(400).json({ valid: false, error: 'Código requerido' }); return; }
    const result = db.validateCoupon(code, Number(total) || 0);
    if (result.valid && result.coupon) {
      const discounted = db.applyDiscount(Number(total) || 0, result.coupon);
      res.json({ valid: true, discount: result.coupon.discount, type: result.coupon.type, total: Math.round(discounted * 100) / 100 });
    } else {
      res.json(result);
    }
  } catch (err) { res.status(500).json({ error: 'Error al validar cupón' }); }
});

// ── Apply coupon and increment use count (al hacer checkout) ────────
app.post('/api/coupons/apply', (req, res) => {
  try {
    const { code, total } = req.body;
    const result = db.validateCoupon(code, Number(total) || 0);
    if (!result.valid || !result.coupon) { res.json(result); return; }
    db.incrementCouponUse(result.coupon.id);
    const discounted = db.applyDiscount(Number(total) || 0, result.coupon);
    res.json({ valid: true, discount: result.coupon.discount, type: result.coupon.type, total: Math.round(discounted * 100) / 100 });
  } catch (err) { res.status(500).json({ error: 'Error al aplicar cupón' }); }
});

// ── Blog API ─────────────────────────────────────────────────────────
const postsLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Demasiadas peticiones' } });

app.get('/api/posts', postsLimiter, (req, res) => {
  try {
    const includeAll = req.query.all === '1';
    res.json(db.getAllPosts(includeAll));
  } catch (err) { res.status(500).json({ error: 'Error al obtener posts' }); }
});

app.get('/api/posts/:slug', postsLimiter, (req, res) => {
  try {
    const post = db.getPostBySlug(req.params.slug as string);
    if (!post) { res.status(404).json({ error: 'Post no encontrado' }); return; }
    res.json(post);
  } catch (err) { res.status(500).json({ error: 'Error al obtener post' }); }
});

app.post('/api/posts', authenticateToken, (req, res) => {
  try {
    const { title, content, slug, excerpt, image, author, published } = req.body;
    if (!title || !content) { res.status(400).json({ error: 'Título y contenido requeridos' }); return; }
    const post = db.createPost({ title: String(title).trim().slice(0, 200), content: String(content), slug: slug ? String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : undefined, excerpt: String(excerpt || '').trim().slice(0, 300), image, author, published: published ? 1 : 0 });
    res.status(201).json(post);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT') { res.status(400).json({ error: 'Este slug ya existe' }); return; }
    logger.error({ err, path: '/api/posts POST' }, 'Error creating post');
    res.status(500).json({ error: 'Error al crear post' });
  }
});

app.put('/api/posts/:id', authenticateToken, (req, res) => {
  try {
    const ok = db.updatePost(req.params.id as string, req.body);
    if (!ok) { res.status(404).json({ error: 'Post no encontrado' }); return; }
    res.json(db.getPost(req.params.id as string));
  } catch (err) { res.status(500).json({ error: 'Error al actualizar post' }); }
});

app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  try {
    if (!db.deletePost(req.params.id as string)) { res.status(404).json({ error: 'Post no encontrado' }); return; }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar post' }); }
});

// ── Reviews ───────────────────────────────────────────────────────────
const reviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Demasiadas peticiones' } });

app.get('/api/products/:id/reviews', (req, res) => {
  try {
    const reviews = db.getProductReviews(req.params.id as string);
    const stats = db.getReviewStats(req.params.id as string);
    res.json({ reviews, stats });
  } catch { res.status(500).json({ error: 'Error al obtener reseñas' }); }
});

app.post('/api/products/:id/reviews', reviewLimiter, (req, res) => {
  try {
    const { name, rating, comment } = req.body;
    if (!name || !rating) { res.status(400).json({ error: 'Nombre y puntuación requeridos' }); return; }
    const r = Number(rating);
    if (r < 1 || r > 5) { res.status(400).json({ error: 'Puntuación debe ser 1-5' }); return; }
    const review = db.createReview({ product_id: req.params.id as string, name: String(name).trim().slice(0, 80), rating: r, comment: String(comment || '').trim().slice(0, 500) });
    res.status(201).json(review);
  } catch { res.status(500).json({ error: 'Error al crear reseña' }); }
});

app.get('/api/reviews', authenticateToken, (req, res) => {
  try { res.json(db.getAllReviews()); }
  catch { res.status(500).json({ error: 'Error al obtener reseñas' }); }
});

app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
  try {
    if (!db.deleteReview(req.params.id as string)) { res.status(404).json({ error: 'No encontrada' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ── Newsletter ────────────────────────────────────────────────────────
app.post('/api/newsletter/subscribe', (req, res) => {
  try {
    const { email, name, source } = req.body;
    if (!email) { res.status(400).json({ error: 'Email requerido' }); return; }
    const result = db.subscribe(email, name, source || 'newsletter');
    if (result.ok) {
      // Enviar email con código de descuento
      const discountCode = 'LUMI10';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#0A0A0F;color:#F0EDE8;padding:2rem;">
<div style="max-width:500px;margin:0 auto;background:#12121A;border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:2rem;">
<h1 style="color:#C9A84C;">⚡ LumiCharge</h1>
<p style="color:#9B9AA8;">¡Gracias por suscribirte, ${name || 'cliente'}!</p>
<p style="color:#9B9AA8;margin-bottom:1.5rem;">Este es tu código de descuento exclusivo para tu primera compra:</p>
<div style="background:rgba(201,168,76,.1);border:1px dashed rgba(201,168,76,.4);border-radius:8px;padding:1rem;text-align:center;margin-bottom:1.5rem;">
  <span style="font-size:1.5rem;font-weight:700;color:#C9A84C;letter-spacing:.2em;">${discountCode}</span>
</div>
<p style="color:#9B9AA8;font-size:.85rem;">Válido para un -10% en tu primer pedido en LumiCharge Pro.</p>
<a href="${FRONTEND_URL}" style="display:inline-block;background:#C9A84C;color:#0A0A0F;padding:.7rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;margin-top:.5rem;">Ir a la tienda →</a>
<p style="color:#555;font-size:.75rem;margin-top:1.5rem;">LumiCharge Technologies S.L. · Si no pediste este código, ignora este email.</p>
</div></body></html>`;
      sendEmail({ to: email, subject: '🎉 Tu código de descuento LumiCharge', html }).catch(() => {});
      res.json({ ok: true, message: 'Código enviado a tu email' });
    } else res.status(400).json({ error: result.error });
  } catch (err) { logger.error({ err }, 'Error subscribe'); res.status(500).json({ error: 'Error al suscribir' }); }
});

app.get('/api/newsletter/subscribers', authenticateToken, (req, res) => {
  try { res.json(db.getSubscribers()); }
  catch { res.status(500).json({ error: 'Error al obtener suscriptores' }); }
});

app.delete('/api/newsletter/subscribers/:id', authenticateToken, (req, res) => {
  try {
    if (!db.deleteSubscriber(req.params.id as string)) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error al eliminar' }); }
});

app.get('/api/newsletter/export', authenticateToken, (req, res) => {
  try {
    const subs = db.getSubscribers();
    const csv = ['Email,Nombre,Fecha,Origen', ...subs.map(s => `"${s.email}","${s.name}","${s.created}","${s.source}"`)].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="suscriptores-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch { res.status(500).json({ error: 'Error al exportar' }); }
});

// ── Public order tracking ────────────────────────────────────────────
app.post('/api/tracking', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) { res.status(400).json({ error: 'ID de pedido requerido' }); return; }
    const order = db.getOrder(String(id).trim());
    if (!order) { res.json({ found: false }); return; }
    res.json({
      found: true,
      id: order.id,
      name: order.name,
      total: order.total,
      status: order.status,
      created: order.created,
      // Email no se expone al público
    });
  } catch { res.status(500).json({ error: 'Error al buscar pedido' }); }
});

app.get('/producto/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/account', (req, res) => res.sendFile(path.join(__dirname, 'public', 'account.html')));

app.get('/tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
});

// ── Landing pages API ────────────────────────────────────────────────
app.get('/api/landing-pages', authenticateToken, (req, res) => {
  try { res.json(db.getAllLandingPages()); }
  catch { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/landing-pages', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    const { title, slug, subtitle, content, image, discount, discount_code } = req.body;
    if (!title) { res.status(400).json({ error: 'Título requerido' }); return; }
    const page = db.createLandingPage({ title, slug: slug || undefined, subtitle, content, image, discount: Number(discount) || 0, discount_code });
    res.status(201).json(page);
  } catch (err: any) {
    if (err?.code?.startsWith('SQLITE_CONSTRAINT')) { res.status(400).json({ error: 'Este slug ya existe' }); return; }
    logger.error({ err }, 'Error creating landing page');
    res.status(500).json({ error: 'Error' });
  }
});

app.put('/api/landing-pages/:id', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    const ok = db.updateLandingPage(req.params.id as string, req.body);
    if (!ok) { res.status(404).json({ error: 'No encontrada' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error' }); }
});

app.delete('/api/landing-pages/:id', authenticateToken, adminWriteLimiter, (req, res) => {
  try {
    if (!db.deleteLandingPage(req.params.id as string)) { res.status(404).json({ error: 'No encontrada' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error' }); }
});

// ── Landing page public route ────────────────────────────────────────
app.get('/p/:slug', (req, res) => {
  const page = db.getLandingPageBySlug(req.params.slug as string);
  if (!page) { res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')); return; }

  const discountHtml = page.discount > 0
    ? `<div style="background:rgba(231,76,60,.1);border:1px dashed rgba(231,76,60,.4);border-radius:12px;padding:1.5rem;text-align:center;margin:2rem 0;">
        <div style="font-size:2rem;font-weight:700;color:#E74C3C;letter-spacing:.1em;">${page.discount}% DESCUENTO</div>
        <div style="font-size:1.1rem;color:var(--text-muted);margin-top:.3rem;">Código: <span style="color:#C9A84C;font-weight:700;letter-spacing:.15em;">${page.discount_code || 'LUMI' + page.discount}</span></div>
      </div>` : '';

  res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${page.title} — LumiCharge</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400..700;1,400..700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400..700;1,400..700&display=swap"></noscript>
<link rel="stylesheet" href="/src/style.css">
<style>
  .lp-wrap { max-width:700px; margin:0 auto; padding:3rem 5% 5rem; text-align:center; min-height:100vh; display:flex; flex-direction:column; justify-content:center; }
  .lp-icon { font-size:6rem; display:block; margin-bottom:1rem; }
  .lp-title { font-size:clamp(2rem,4vw,3.5rem); font-weight:700; margin-bottom:.5rem; }
  .lp-sub { font-size:1.1rem; color:var(--text-muted); margin-bottom:1.5rem; line-height:1.6; max-width:500px; margin-left:auto; margin-right:auto; }
  .lp-content { font-size:.95rem; color:var(--text-muted); line-height:1.7; max-width:550px; margin:0 auto; }
  .lp-cta { display:inline-block; background:var(--gold); color:var(--dark); padding:.9rem 2.5rem; border-radius:8px; font-size:1rem; font-weight:700; text-decoration:none; margin-top:1.5rem; transition:transform .2s; }
  .lp-cta:hover { transform:translateY(-2px); }
  .lp-footer { margin-top:3rem; font-size:.8rem; color:var(--text-muted); }
</style></head><body>
<div class="lp-wrap">
  <span class="lp-icon">${page.image || '🎯'}</span>
  <h1 class="lp-title">${page.title}</h1>
  ${page.subtitle ? '<p class="lp-sub">' + page.subtitle + '</p>' : ''}
  ${discountHtml}
  ${page.content ? '<div class="lp-content">' + page.content + '</div>' : ''}
  <a href="/" class="lp-cta">Ver oferta →</a>
  <div class="lp-footer">LumiCharge Technologies S.L.</div>
</div></body></html>`);
});

// ── Blog pages ────────────────────────────────────────────────────────
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get('/blog/:slug', (req, res) => {
  const post = db.getPostBySlug(req.params.slug as string);
  if (!post || !post.published) {
    res.status(404).sendFile(path.join(__dirname, 'public', 'blog.html'));
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

// ── Cart page ────────────────────────────────────────────────────────
app.get('/carrito', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

// ── Serve SPA fallback ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sentry error handler (must be after routes)
app.use(getSentryErrorHandler());

// ── Start (solo si es el entry point, no en tests) ──────────────────
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info({ port: PORT, stripe: !!stripe, nodeEnv: NODE_ENV }, 'Servidor iniciado');
    logger.info(`http://localhost:${PORT}`);
    logger.info(`Admin: http://localhost:${PORT}/admin`);
    logger.info(`Stripe: ${stripe ? '✓ LIVE' : '○ DEMO'}`);
  });

  // Cleanup expired tokens cada hora
  setInterval(() => db.cleanupExpiredTokens(), 3600000);

  // ── Graceful shutdown ───────────────────────────────────────────
  function shutdown(): void {
    logger.info('Apagando servidor...');
    io.close();
    server.close();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export default app;
