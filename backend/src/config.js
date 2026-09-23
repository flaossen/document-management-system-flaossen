const path = require('node:path');

const defaultStoragePath = path.resolve(__dirname, '..', 'storage');

function getAllowedMimeTypes() {
  return (process.env.ALLOWED_MIME_TYPES || 'application/pdf,text/plain,image/png,image/jpeg')
    .split(',')
    .map((mimeType) => mimeType.trim())
    .filter(Boolean);
}

function getConfig() {
  const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);

  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo');
  }

  return {
    maxFileSize,
    storagePath: process.env.STORAGE_PATH
      ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
      : defaultStoragePath,
    allowedMimeTypes: getAllowedMimeTypes(),
  };
}

module.exports = { getConfig };