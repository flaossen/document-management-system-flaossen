const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/app');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

test('faz upload, lista e baixa um documento', async () => {
  const server = await startServer();
  const storagePath = path.resolve(__dirname, '..', 'storage');

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const userHeaders = { 'X-User-Id': 'endpoint-test-user' };
    const formData = new FormData();
    formData.append('file', new Blob(['conteudo do endpoint'], { type: 'text/plain' }), 'endpoint.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: userHeaders,
      body: formData,
    });

    assert.equal(uploadResponse.status, 201);
    const document = await uploadResponse.json();
    assert.equal(document.originalName, 'endpoint.txt');
    assert.equal(document.owner, 'endpoint-test-user');
    assert.ok(document.id);

    const listResponse = await fetch(`${baseUrl}/documents`, { headers: userHeaders });
    assert.equal(listResponse.status, 200);
    const list = await listResponse.json();
    assert.ok(list.documents.some((item) => item.id === document.id));

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: userHeaders,
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), 'conteudo do endpoint');
  } finally {
    server.close();
    const files = fs.readdirSync(storagePath);
    for (const fileName of files) {
      if (fileName !== '.gitkeep') {
        fs.rmSync(path.join(storagePath, fileName), { force: true });
      }
    }
  }
});
