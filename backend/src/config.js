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
  const authMode = process.env.AUTH_MODE || 'header';

  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo');
  }

  if (!['header', 'hmac'].includes(authMode)) {
    throw new Error('AUTH_MODE deve ser header ou hmac');
  }

  if (authMode === 'hmac' && !process.env.USER_HEADER_SECRET) {
    throw new Error('USER_HEADER_SECRET é obrigatório quando AUTH_MODE=hmac');
  }

  return {
    authMode,
    port: Number(process.env.PORT || 3000),
    maxFileSize,
    storagePath: process.env.STORAGE_PATH
      ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
      : defaultStoragePath,
    allowedMimeTypes: getAllowedMimeTypes(),
    userHeaderSecret: process.env.USER_HEADER_SECRET || '',
  };
}

module.exports = { getConfig };