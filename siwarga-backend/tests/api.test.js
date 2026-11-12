const { describe, it, after } = require('node:test');
const assert = require('node:assert');

// Middlewares & Routers
const { verifyAuth, requireAdmin, requireSuperAdmin } = require('../middlewares/authMiddleware');
const { errorHandler } = require('../middlewares/errorHandler');
const apiRoutes = require('../routes');
const db = require('../db');

// Tutup koneksi pool agar Node.js test runner dapat segera exit dengan clean
after(async () => {
  try {
    if (db && typeof db.end === 'function') {
      await db.end();
    }
  } catch (err) {
    // Abaikan jika sudah tertutup
  }
});

describe('Middleware & Route Verification Tests (CI-Ready without DB)', () => {

  describe('1. Auth Middleware Unit Tests', () => {
    it('verifyAuth harus mengembalikan 401 jika header otentikasi kosong', async () => {
      let statusCode = null;
      let jsonPayload = null;

      const req = { headers: {} };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await verifyAuth(req, res, next);

      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonPayload.success, false);
      assert.strictEqual(nextCalled, false);
    });

    it('requireAdmin harus memblokir role WARGA dengan status 403', () => {
      let statusCode = null;
      let jsonPayload = null;

      const req = { user: { role: 'WARGA' } };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      requireAdmin(req, res, next);

      assert.strictEqual(statusCode, 403);
      assert.strictEqual(jsonPayload.success, false);
      assert.strictEqual(nextCalled, false);
    });

    it('requireAdmin harus mengizinkan role ADMIN_DESA, ADMIN, atau SUPER_ADMIN', () => {
      ['ADMIN_DESA', 'ADMIN', 'SUPER_ADMIN'].forEach(role => {
        const req = { user: { role } };
        const res = {};
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        requireAdmin(req, res, next);
        assert.strictEqual(nextCalled, true, `Role ${role} seharusnya lolos requireAdmin`);
      });
    });

    it('requireSuperAdmin harus menolak ADMIN_DESA dengan status 403', () => {
      let statusCode = null;
      let jsonPayload = null;

      const req = { user: { role: 'ADMIN_DESA' } };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      requireSuperAdmin(req, res, next);

      assert.strictEqual(statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    it('requireSuperAdmin harus mengizinkan role SUPER_ADMIN', () => {
      const req = { user: { role: 'SUPER_ADMIN' } };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      requireSuperAdmin(req, res, next);
      assert.strictEqual(nextCalled, true);
    });
  });

  describe('2. Error Handler Middleware Tests', () => {
    it('errorHandler harus merespon dengan status 500 dan format JSON terstandar', () => {
      let statusCode = null;
      let jsonPayload = null;

      const err = new Error('Test Error Synthetic');
      const req = {};
      const res = {
        headersSent: false,
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };
      const next = () => {};

      errorHandler(err, req, res, next);

      assert.strictEqual(statusCode, 500);
      assert.strictEqual(jsonPayload.success, false);
      assert.strictEqual(jsonPayload.message, 'Terjadi kesalahan internal pada server.');
    });
  });

  describe('3. API Routes Architecture Verification', () => {
    it('Router utama Express harus terdefinisi dan memiliki sub-router terdaftar', () => {
      assert.ok(apiRoutes, 'apiRoutes harus terdefinisi');
      assert.strictEqual(typeof apiRoutes, 'function', 'apiRoutes harus merupakan Express middleware router');
      assert.ok(apiRoutes.stack && apiRoutes.stack.length > 0, 'apiRoutes harus memiliki rute terdaftar');
    });
  });

});
