const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const appModule = require('../src/app');

const { createApp } = appModule;

async function withServer(config, callback) {
  const server = createApp(config).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function createTempStorage() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
}

function createConfig(storagePath, maxFileSize = 1024 * 1024, authMode = 'header') {
  return {
    authMode,
    port: 0,
    storagePath,
    maxFileSize,
    allowedMimeTypes: ['text/plain', 'application/pdf', 'image/png', 'image/jpeg'],
    userHeaderSecret: 'test-secret',
  };
}

test('isola documentos por usuário e rejeita IDs inválidos', async () => {
  const storagePath = createTempStorage();

  try {
    await withServer(createConfig(storagePath), async (baseUrl) => {
      const form = new FormData();
      form.append('file', new Blob(['conteúdo'], { type: 'text/plain' }), '../privado.txt');

      const upload = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-1' },
        body: form,
      });
      assert.equal(upload.status, 201);
      const document = await upload.json();
      assert.equal(document.originalName, 'privado.txt');

      const otherUserDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
        headers: { 'X-User-Id': 'user-2' },
      });
      assert.equal(otherUserDownload.status, 404);

      const invalidId = await fetch(`${baseUrl}/documents/../etc/download`, {
        headers: { 'X-User-Id': 'user-1' },
      });
      assert.notEqual(invalidId.status, 200);
    });
  } finally {
    fs.rmSync(storagePath, { recursive: true, force: true });
  }
});

test('rejeita conteúdo que finge ser PDF', async () => {
  const storagePath = createTempStorage();

  try {
    await withServer(createConfig(storagePath), async (baseUrl) => {
      const form = new FormData();
      form.append('file', new Blob(['não é PDF'], { type: 'application/pdf' }), 'arquivo.pdf');

      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-1' },
        body: form,
      });

      assert.equal(response.status, 415);
      assert.deepEqual(await fs.promises.readdir(storagePath), []);
    });
  } finally {
    fs.rmSync(storagePath, { recursive: true, force: true });
  }
});

test('remove arquivo parcial quando o limite do Multer é excedido', async () => {
  const storagePath = createTempStorage();

  try {
    await withServer(createConfig(storagePath, 4), async (baseUrl) => {
      const form = new FormData();
      form.append('file', new Blob(['arquivo maior'], { type: 'text/plain' }), 'grande.txt');

      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-1' },
        body: form,
      });

      assert.equal(response.status, 413);
      assert.deepEqual(await fs.promises.readdir(storagePath), []);
    });
  } finally {
    fs.rmSync(storagePath, { recursive: true, force: true });
  }
});

test('modo HMAC rejeita identidade sem assinatura e aceita assinatura válida', async () => {
  const storagePath = createTempStorage();
  const userId = 'user-1';
  const signature = crypto.createHmac('sha256', 'test-secret').update(userId).digest('hex');

  try {
    await withServer(createConfig(storagePath, 1024 * 1024, 'hmac'), async (baseUrl) => {
      const withoutSignature = await fetch(`${baseUrl}/documents`, {
        headers: { 'X-User-Id': userId },
      });
      assert.equal(withoutSignature.status, 401);

      const withSignature = await fetch(`${baseUrl}/documents`, {
        headers: {
          'X-User-Id': userId,
          'X-User-Signature': signature,
        },
      });
      assert.equal(withSignature.status, 200);
    });
  } finally {
    fs.rmSync(storagePath, { recursive: true, force: true });
  }
});
