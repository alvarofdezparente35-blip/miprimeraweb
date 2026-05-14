import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';

let csrfToken: string = '';
let cookies: string[] = [];

describe('API', () => {
  describe('GET /api/health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.orders).toBe('number');
    });
  });

  describe('GET /api/csrf-token', () => {
    it('returns a CSRF token and sets session cookie', async () => {
      const res = await request(app).get('/api/csrf-token');
      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeTruthy();
      expect(typeof res.body.csrfToken).toBe('string');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('fails with wrong password', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const token = csrfRes.body.csrfToken;
      const sessionCookie = csrfRes.headers['set-cookie']![0];

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', token)
        .send({ password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('succeeds with correct password', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const token = csrfRes.body.csrfToken;
      const sessionCookie = csrfRes.headers['set-cookie']![0];

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', token)
        .send({ password: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeTruthy();

      csrfToken = res.body.csrfToken;
      cookies = res.headers['set-cookie']!;
    });
  });

  describe('POST /api/orders', () => {
    it('creates an order', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const token = csrfRes.body.csrfToken;
      const sessionCookie = csrfRes.headers['set-cookie']![0];

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'API Test',
          email: 'api@test.com',
          address: 'Calle API 456',
          city: 'Barcelona',
          zip: '08001',
          quantity: 1,
          total: 30.25,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.name).toBe('API Test');
      expect(res.body.status).toBe('pending');
    });

    it('rejects order without required fields', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const token = csrfRes.body.csrfToken;
      const sessionCookie = csrfRes.headers['set-cookie']![0];

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', token)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Campos obligatorios: name, email, address');
    });
  });

  describe('GET /api/orders', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('returns orders when authenticated', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('updates order status', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const sessionCookie = csrfRes.headers['set-cookie']![0];

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', csrfRes.body.csrfToken)
        .send({ name: 'Update', email: 'up@test.com', address: 'Addr', total: 10 });

      const orderId = orderRes.body.id;

      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', csrfRes.body.csrfToken)
        .send({ password: 'admin' });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Cookie', loginRes.headers['set-cookie']!)
        .set('X-CSRF-Token', loginRes.body.csrfToken)
        .send({ status: 'shipped' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('shipped');
    });

    it('rejects invalid status', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)
        .send({ password: 'admin' });

      const res = await request(app)
        .put('/api/orders/nonexistent/status')
        .set('Cookie', loginRes.headers['set-cookie']!)
        .set('X-CSRF-Token', loginRes.body.csrfToken)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/checkout/create-payment-intent', () => {
    it('returns demo mode when stripe not configured', async () => {
      const csrfRes = await request(app).get('/api/csrf-token');
      const res = await request(app)
        .post('/api/checkout/create-payment-intent')
        .set('Cookie', csrfRes.headers['set-cookie']!)
        .set('X-CSRF-Token', csrfRes.body.csrfToken)
        .send({ amount: 30.25, currency: 'eur' });

      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('demo');
    });
  });

  describe('CSRF protection', () => {
    it('blocks POST without CSRF token', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ name: 'No CSRF', email: 'x@x.com', address: 'X' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CSRF token inválido');
    });
  });
});
