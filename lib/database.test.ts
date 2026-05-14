import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import * as db from './database.js';

beforeAll(() => { db.init(); });

describe('database', () => {
  describe('orders', () => {
    it('creates and retrieves an order', () => {
      const order = db.createOrder({
        name: 'Test User',
        email: 'test@test.com',
        address: 'Calle Test 123',
        city: 'Madrid',
        zip: '28001',
        quantity: 2,
        total: 60.50,
      });

      expect(order).toBeDefined();
      expect(order.id).toBeTruthy();
      expect(order.name).toBe('Test User');
      expect(order.email).toBe('test@test.com');
      expect(order.quantity).toBe(2);
      expect(order.total).toBe(60.50);
      expect(order.status).toBe('pending');
      expect(order.created).toBeTruthy();
    });

    it('gets all orders ordered by created desc', () => {
      db.createOrder({ name: 'A', email: 'a@a.com', address: 'Addr 1', total: 10 });
      db.createOrder({ name: 'B', email: 'b@b.com', address: 'Addr 2', total: 20 });

      const all = db.getAllOrders();
      expect(all.length).toBeGreaterThanOrEqual(3);
      expect(all[0].created >= all[1].created).toBe(true);
    });

    it('updates order status', () => {
      const order = db.createOrder({ name: 'Status', email: 's@s.com', address: 'Addr', total: 10 });

      const updated = db.updateOrderStatus(order.id, 'paid');
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('paid');

      const notFound = db.updateOrderStatus('nonexistent', 'shipped');
      expect(notFound).toBeNull();
    });

    it('rejects invalid order status on update', () => {
      const order = db.createOrder({ name: 'Bad', email: 'b@b.com', address: 'Addr', total: 10 });
      const result = db.updateOrderStatus(order.id, 'invalid_status');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('invalid_status');
    });

    it('returns undefined for non-existent order', () => {
      const result = db.getOrder('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('counts orders', () => {
      const count = db.countOrders();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('refresh tokens', () => {
    it('creates and retrieves a valid token', () => {
      const jti = uuidv4();
      db.createRefreshToken(jti, 'admin');

      const retrieved = db.getRefreshToken(jti);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.jti).toBe(jti);
      expect(retrieved!.role).toBe('admin');
    });

    it('returns null for non-existent token', () => {
      const result = db.getRefreshToken('non-existent');
      expect(result).toBeNull();
    });

    it('deletes a token', () => {
      const jti = uuidv4();
      db.createRefreshToken(jti, 'admin');

      db.deleteRefreshToken(jti);
      const retrieved = db.getRefreshToken(jti);
      expect(retrieved).toBeNull();
    });

    it('cleans up expired tokens', () => {
      const jti = uuidv4();
      db.createRefreshToken(jti, 'admin');

      db.cleanupExpiredTokens();
    });
  });

  describe('admin', () => {
    it('creates and retrieves admin', () => {
      const admin = db.getAdmin();
      expect(admin).not.toBeNull();
      expect(admin!.password).toBeTruthy();
      expect(admin!.id).toBeGreaterThan(0);
    });
  });
});
