import Database from 'better-sqlite3';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';

const PROJECT_ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH || path.join(PROJECT_ROOT, 'prisma', 'dev.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface Order {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  quantity: number;
  total: number;
  status: string;
  created: string;
}

export interface CreateOrderInput {
  name: string;
  email: string;
  address: string;
  city?: string;
  zip?: string;
  quantity?: number;
  total?: number;
}

interface RefreshTokenRow {
  jti: string;
  role: string;
  expires_at: string;
}

interface AdminRow {
  id: number;
  password: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  active: number;
  created: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock?: number;
  category?: string;
}

export function init(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      price       REAL NOT NULL,
      image       TEXT DEFAULT '📦',
      stock       INTEGER DEFAULT 0,
      category    TEXT DEFAULT 'general',
      active      INTEGER DEFAULT 1,
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id          TEXT PRIMARY KEY,
      product_id  TEXT NOT NULL,
      customer_id TEXT DEFAULT '',
      name        TEXT NOT NULL,
      rating      INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment     TEXT DEFAULT '',
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT DEFAULT '',
      source      TEXT DEFAULT 'newsletter',
      active      INTEGER DEFAULT 1,
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password      TEXT NOT NULL,
      name          TEXT DEFAULT '',
      default_addr  TEXT DEFAULT '',
      default_city  TEXT DEFAULT '',
      default_zip   TEXT DEFAULT '',
      created       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      excerpt     TEXT DEFAULT '',
      image       TEXT DEFAULT '📰',
      author      TEXT DEFAULT 'LumiCharge',
      published   INTEGER DEFAULT 0,
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id          TEXT PRIMARY KEY,
      code        TEXT NOT NULL UNIQUE,
      discount    REAL NOT NULL,
      type        TEXT DEFAULT 'percentage',
      min_amount  REAL DEFAULT 0,
      max_uses    INTEGER DEFAULT 0,
      use_count   INTEGER DEFAULT 0,
      active      INTEGER DEFAULT 1,
      expires_at  TEXT,
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit (
      id          TEXT PRIMARY KEY,
      action      TEXT NOT NULL,
      detail      TEXT DEFAULT '',
      ip          TEXT DEFAULT '',
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      customer_id TEXT DEFAULT '',
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      address     TEXT NOT NULL,
      city        TEXT DEFAULT '',
      zip         TEXT DEFAULT '',
      quantity    INTEGER DEFAULT 1,
      total       REAL NOT NULL,
      status      TEXT DEFAULT 'pending',
      created     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      jti        TEXT PRIMARY KEY,
      role       TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      password   TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  logger.info('Base de datos inicializada');
}

export function createOrder(input: CreateOrderInput): Order {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO orders (id, name, email, address, city, zip, quantity, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, input.name, input.email, input.address, input.city || '', input.zip || '', input.quantity || 1, input.total || 25.0);
  return getOrder(id)!;
}

export function getOrder(id: string): Order | undefined {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
}

export function getAllOrders(): Order[] {
  return db.prepare('SELECT * FROM orders ORDER BY created DESC').all() as Order[];
}

export function updateOrderStatus(id: string, status: string): Order | null {
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  if (result.changes === 0) return null;
  return getOrder(id) ?? null;
}

export function countOrders(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  return row.count;
}

// ── Products ─────────────────────────────────────────────────────────
export function createProduct(input: CreateProductInput): Product {
  const id = uuidv4();
  db.prepare('INSERT INTO products (id, name, description, price, image, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, input.name, input.description || '', input.price, input.image || '📦', input.stock ?? 0, input.category || 'general');
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
}

export function getAllProducts(includeInactive = false): Product[] {
  const sql = includeInactive ? 'SELECT * FROM products ORDER BY created DESC' : "SELECT * FROM products WHERE active = 1 ORDER BY created DESC";
  return db.prepare(sql).all() as Product[];
}

export function getProduct(id: string): Product | undefined {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

export function updateProduct(id: string, input: Partial<CreateProductInput & { active: number }>): Product | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
  if (input.price !== undefined) { fields.push('price = ?'); values.push(input.price); }
  if (input.image !== undefined) { fields.push('image = ?'); values.push(input.image); }
  if (input.stock !== undefined) { fields.push('stock = ?'); values.push(input.stock); }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
  if (input.active !== undefined) { fields.push('active = ?'); values.push(input.active); }

  if (fields.length === 0) return getProduct(id) ?? null;

  values.push(id);
  const result = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) return null;
  return getProduct(id) ?? null;
}

export function deleteProduct(id: string): boolean {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function countProducts(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  return row.count;
}

export function seedProducts(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (existing.count > 0) return;

  const products = [
    { name: 'LumiCharge Pro 50W', description: 'Cargador inalámbrico 50W con luz RGB personalizable. 3 dispositivos simultáneos.', price: 25.00, image: '⚡', stock: 12, category: 'cargadores' },
    { name: 'Cable USB-C a MagSafe 2m', description: 'Cable de carga rápida USB-C a MagSafe. Trenzado en nylon. 2 metros.', price: 9.99, image: '🔌', stock: 50, category: 'accesorios' },
    { name: 'Soporte Plegable Aluminio', description: 'Soporte ajustable de aluminio para escritorio. Compatible con todos los dispositivos.', price: 14.99, image: '📱', stock: 30, category: 'accesorios' },
    { name: 'Hub USB-C 7 en 1', description: 'Hub multipuerto USB-C con HDMI 4K, 3x USB-A, SD/TF, PD 100W.', price: 29.99, image: '🖥️', stock: 20, category: 'accesorios' },
    { name: 'Pack Escritorio Completo', description: 'LumiCharge Pro + Cable USB-C + Soporte Plegable con 30% descuento.', price: 34.99, image: '🎁', stock: 8, category: 'packs' },
  ];

  const stmt = db.prepare('INSERT INTO products (id, name, description, price, image, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const p of products) {
    stmt.run(uuidv4(), p.name, p.description, p.price, p.image, p.stock, p.category);
  }
  logger.info({ count: products.length }, 'Productos seed creados');
}

// ── Coupons ──────────────────────────────────────────────────────────
export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: string; // 'percentage' | 'fixed'
  min_amount: number;
  max_uses: number;
  use_count: number;
  active: number;
  expires_at: string | null;
  created: string;
}

// ── Blog posts ───────────────────────────────────────────────────────
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  published: number;
  created: string;
}

export function createPost(input: { title: string; content: string; slug?: string; excerpt?: string; image?: string; author?: string; published?: number }): Post {
  const id = uuidv4();
  const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 4);
  db.prepare('INSERT INTO posts (id, slug, title, content, excerpt, image, author, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, slug, input.title, input.content, input.excerpt || input.title, input.image || '📰', input.author || 'LumiCharge', input.published ?? 0);
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post;
}

export function getAllPosts(includeUnpublished = false): Post[] {
  const sql = includeUnpublished ? 'SELECT * FROM posts ORDER BY created DESC' : "SELECT * FROM posts WHERE published = 1 ORDER BY created DESC";
  return db.prepare(sql).all() as Post[];
}

export function getPostBySlug(slug: string): Post | undefined {
  return db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug) as Post | undefined;
}

export function getPost(id: string): Post | undefined {
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post | undefined;
}

export function updatePost(id: string, input: Partial<{ title: string; content: string; slug: string; excerpt: string; image: string; author: string; published: number }>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title); }
  if (input.content !== undefined) { fields.push('content = ?'); values.push(input.content); }
  if (input.slug !== undefined) { fields.push('slug = ?'); values.push(input.slug); }
  if (input.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(input.excerpt); }
  if (input.image !== undefined) { fields.push('image = ?'); values.push(input.image); }
  if (input.author !== undefined) { fields.push('author = ?'); values.push(input.author); }
  if (input.published !== undefined) { fields.push('published = ?'); values.push(input.published); }
  if (fields.length === 0) return false;
  values.push(id);
  const result = db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function deletePost(id: string): boolean {
  return db.prepare('DELETE FROM posts WHERE id = ?').run(id).changes > 0;
}

// ── Customers ─────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  email: string;
  password: string;
  name: string;
  default_addr: string;
  default_city: string;
  default_zip: string;
  created: string;
}

export function createCustomer(email: string, password: string, name: string): Customer {
  const id = uuidv4();
  db.prepare('INSERT INTO customers (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, email.toLowerCase().trim(), password, name.trim());
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer;
}

export function getCustomerByEmail(email: string): Customer | undefined {
  return db.prepare('SELECT * FROM customers WHERE email = ?').get(email.toLowerCase().trim()) as Customer | undefined;
}

export function getCustomer(id: string): Customer | undefined {
  return db.prepare('SELECT id, email, name, default_addr, default_city, default_zip, created FROM customers WHERE id = ?').get(id) as Customer | undefined;
}

export function updateCustomer(id: string, input: Partial<{ name: string; default_addr: string; default_city: string; default_zip: string; password: string }>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.default_addr !== undefined) { fields.push('default_addr = ?'); values.push(input.default_addr); }
  if (input.default_city !== undefined) { fields.push('default_city = ?'); values.push(input.default_city); }
  if (input.default_zip !== undefined) { fields.push('default_zip = ?'); values.push(input.default_zip); }
  if (input.password !== undefined) { fields.push('password = ?'); values.push(input.password); }
  if (fields.length === 0) return false;
  values.push(id);
  return db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
}

export function getOrdersByCustomer(customerId: string): Order[] {
  return db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created DESC').all(customerId) as Order[];
}

export function createCustomerOrder(input: CreateOrderInput & { customer_id: string }): Order {
  const id = uuidv4();
  db.prepare('INSERT INTO orders (id, customer_id, name, email, address, city, zip, quantity, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, input.customer_id, input.name, input.email, input.address, input.city || '', input.zip || '', input.quantity || 1, input.total || 25.0);
  return getOrder(id)!;
}

// ── Subscribers ──────────────────────────────────────────────────────
export interface Subscriber {
  id: string;
  email: string;
  name: string;
  source: string;
  active: number;
  created: string;
}

export function subscribe(email: string, name = '', source = 'newsletter'): { ok: boolean; error?: string } {
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { ok: false, error: 'Email inválido' };

  try {
    const id = uuidv4();
    db.prepare('INSERT INTO subscribers (id, email, name, source) VALUES (?, ?, ?, ?)').run(id, normalized, name.trim(), source);
    return { ok: true };
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT') return { ok: false, error: 'Este email ya está suscrito' };
    return { ok: false, error: 'Error al suscribir' };
  }
}

export function getSubscribers(): Subscriber[] {
  return db.prepare('SELECT * FROM subscribers ORDER BY created DESC').all() as Subscriber[];
}

export function countSubscribers(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE active = 1').get() as { count: number };
  return row.count;
}

export function deleteSubscriber(id: string): boolean {
  return db.prepare('DELETE FROM subscribers WHERE id = ?').run(id).changes > 0;
}

// ── Reviews ──────────────────────────────────────────────────────────
export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  name: string;
  rating: number;
  comment: string;
  created: string;
}

export function createReview(input: { product_id: string; customer_id?: string; name: string; rating: number; comment?: string }): Review {
  const id = uuidv4();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  db.prepare('INSERT INTO reviews (id, product_id, customer_id, name, rating, comment) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, input.product_id, input.customer_id || '', input.name.trim().slice(0, 80), rating, (input.comment || '').trim().slice(0, 500));
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as Review;
}

export function getProductReviews(productId: string): Review[] {
  return db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created DESC').all(productId) as Review[];
}

export function getAllReviews(): Review[] {
  return db.prepare('SELECT * FROM reviews ORDER BY created DESC').all() as Review[];
}

export function getReviewStats(productId: string): { average: number; total: number; breakdown: number[] } {
  const all = getProductReviews(productId);
  const total = all.length;
  const avg = total > 0 ? all.reduce((s, r) => s + r.rating, 0) / total : 0;
  const breakdown = [0, 0, 0, 0, 0];
  all.forEach(r => { if (r.rating >= 1 && r.rating <= 5) breakdown[r.rating - 1]++; });
  return { average: Math.round(avg * 10) / 10, total, breakdown };
}

export function deleteReview(id: string): boolean {
  return db.prepare('DELETE FROM reviews WHERE id = ?').run(id).changes > 0;
}

export function seedPosts(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  if (existing.count > 0) return;

  const posts = [
    {
      title: 'Mejores cargadores inalámbricos 2026',
      slug: 'mejores-cargadores-inalambricos-2026',
      content: `<p>El mercado de carga inalámbrica ha evolucionado enormemente. En 2026, los cargadores Qi2 dominan el mercado con velocidades de hasta 50W.</p><h2>¿Qué buscar en un cargador inalámbrico?</h2><p>Potencia, compatibilidad y diseño son los tres pilares. Un buen cargador debe cargar varios dispositivos a la vez, tener una estética que complemente tu escritorio y ser compatible con los últimos estándares.</p><h2>LumiCharge Pro: la mejor opción</h2><p>Con 50W de potencia, carga simultánea de 3 dispositivos y luz RGB personalizable, el LumiCharge Pro se posiciona como el mejor cargador inalámbrico del mercado en 2026.</p><p>Su cuerpo de aluminio aeroespacial y base antideslizante lo hacen perfecto para cualquier escritorio.</p>`,
      excerpt: 'Guía completa con los mejores cargadores inalámbricos de 2026. Comparativa, precios y recomendaciones.',
      image: '⚡',
      published: 1,
    },
    {
      title: 'Cómo organizar tu escritorio como un profesional',
      slug: 'organizar-escritorio-profesional',
      content: `<p>Un escritorio ordenado no solo se ve bien, también mejora tu productividad hasta un 30%. Aquí te damos las claves.</p><h2>1. Elimina el cableado</h2><p>Los cables son la principal fuente de desorden. Un cargador inalámbrico como LumiCharge Pro elimina la necesidad de cables visibles.</p><h2>2. Iluminación ambiental</h2><p>La luz RGB del LumiCharge Pro no solo es decorativa, también reduce la fatiga visual cuando trabajas de noche.</p><h2>3. Menos es más</h2><p>Mantén solo lo esencial en tu escritorio: monitor, teclado, ratón y un cargador que pueda con todo.</p>`,
      excerpt: 'Consejos prácticos para transformar tu espacio de trabajo con un escritorio minimalista y funcional.',
      image: '📋',
      published: 1,
    },
    {
      title: 'Guía completa de carga rápida: todo lo que necesitas saber',
      slug: 'guia-carga-rapida',
      content: `<p>La carga rápida ha revolucionado la forma en que usamos nuestros dispositivos. Pero no toda la carga rápida es igual.</p><h2>¿Qué es la carga rápida?</h2><p>La carga rápida permite entregar más potencia a la batería de forma segura, reduciendo el tiempo de carga significativamente.</p><h2>50W vs 15W: la diferencia es enorme</h2><p>Mientras que los cargadores estándar ofrecen 5W-15W, el LumiCharge Pro llega hasta 50W. Esto significa pasar de 0% a 50% en solo 25 minutos.</p><h2>¿Daña la batería?</h2><p>No. Los cargadores modernos como LumiCharge Pro incorporan gestión térmica inteligente que protege la batería.</p>`,
      excerpt: 'Descubre cómo funciona la carga rápida, mitos y verdades, y por qué 50W marca la diferencia.',
      image: '🔋',
      published: 1,
    },
  ];

  const stmt = db.prepare('INSERT INTO posts (id, slug, title, content, excerpt, image, author, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of posts) {
    stmt.run(uuidv4(), p.slug, p.title, p.content, p.excerpt, p.image, 'LumiCharge', p.published);
  }
  logger.info({ count: posts.length }, 'Posts seed creados');
}

export function createCoupon(input: { code: string; discount: number; type?: string; min_amount?: number; max_uses?: number; expires_at?: string }): Coupon {
  const id = uuidv4();
  const code = input.code.toUpperCase().trim();
  db.prepare('INSERT INTO coupons (id, code, discount, type, min_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, code, input.discount, input.type || 'percentage', input.min_amount || 0, input.max_uses || 0, input.expires_at || null);
  return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as Coupon;
}

export function getAllCoupons(): Coupon[] {
  return db.prepare('SELECT * FROM coupons ORDER BY created DESC').all() as Coupon[];
}

export function getCouponByCode(code: string): Coupon | undefined {
  return db.prepare('SELECT * FROM coupons WHERE code = ?').get(code.toUpperCase().trim()) as Coupon | undefined;
}

export function getCoupon(id: string): Coupon | undefined {
  return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as Coupon | undefined;
}

export function updateCoupon(id: string, input: Partial<{ discount: number; type: string; min_amount: number; max_uses: number; active: number; expires_at: string }>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (input.discount !== undefined) { fields.push('discount = ?'); values.push(input.discount); }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(input.type); }
  if (input.min_amount !== undefined) { fields.push('min_amount = ?'); values.push(input.min_amount); }
  if (input.max_uses !== undefined) { fields.push('max_uses = ?'); values.push(input.max_uses); }
  if (input.active !== undefined) { fields.push('active = ?'); values.push(input.active); }
  if (input.expires_at !== undefined) { fields.push('expires_at = ?'); values.push(input.expires_at); }
  if (fields.length === 0) return false;
  values.push(id);
  const result = db.prepare(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function incrementCouponUse(id: string): void {
  db.prepare('UPDATE coupons SET use_count = use_count + 1 WHERE id = ?').run(id);
}

export function deleteCoupon(id: string): boolean {
  return db.prepare('DELETE FROM coupons WHERE id = ?').run(id).changes > 0;
}

export function validateCoupon(code: string, total: number): { valid: boolean; coupon?: Coupon; error?: string } {
  const coupon = getCouponByCode(code);
  if (!coupon) return { valid: false, error: 'Código inválido' };
  if (!coupon.active) return { valid: false, error: 'Este cupón ya no está activo' };
  if (coupon.max_uses > 0 && coupon.use_count >= coupon.max_uses) return { valid: false, error: 'Este cupón ya no tiene usos disponibles' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { valid: false, error: 'Este cupón ha expirado' };
  if (total < coupon.min_amount) return { valid: false, error: `Mínimo de compra: €${coupon.min_amount.toFixed(2).replace('.', ',')}` };
  return { valid: true, coupon };
}

export function applyDiscount(total: number, coupon: Coupon): number {
  if (coupon.type === 'percentage') return total * (1 - coupon.discount / 100);
  return Math.max(0, total - coupon.discount);
}

export function createRefreshToken(jti: string, role: string): void {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO refresh_tokens (jti, role, expires_at) VALUES (?, ?, ?)').run(jti, role, expiresAt);
}

export function getRefreshToken(jti: string): RefreshTokenRow | null {
  const t = db.prepare("SELECT * FROM refresh_tokens WHERE jti = ? AND expires_at > datetime('now')").get(jti) as RefreshTokenRow | undefined;
  return t || null;
}

export function deleteRefreshToken(jti: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE jti = ?').run(jti);
}

export function cleanupExpiredTokens(): void {
  const result = db.prepare("DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')").run();
  if (result.changes > 0) logger.info({ deleted: result.changes }, 'Tokens expirados limpiados');
}

export function getAdmin(): AdminRow | null {
  return (db.prepare('SELECT * FROM admins ORDER BY id LIMIT 1').get() as AdminRow | undefined) || null;
}

export function createAdmin(password: string): void {
  db.prepare('INSERT INTO admins (password) VALUES (?)').run(password);
}

// ── Admin audit log ─────────────────────────────────────────────────
export function logAdminAction(action: string, detail = '', ip = ''): void {
  const id = uuidv4();
  db.prepare('INSERT INTO admin_audit (id, action, detail, ip) VALUES (?, ?, ?, ?)').run(id, action, detail.slice(0, 500), ip);
}

export function getAuditLog(limit = 50): { id: string; action: string; detail: string; ip: string; created: string }[] {
  return db.prepare('SELECT * FROM admin_audit ORDER BY created DESC LIMIT ?').all(limit) as any[];
}
