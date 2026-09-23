const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const path = require('node:path');
const { AppError } = require('../errors');
const { validateUserId } = require('../services/document-service');

function createDocumentRouter({ config, controller }) {
  const router = require('express').Router();
  const storage = multer.diskStorage({
    destination: config.storagePath,
    filename: (req, file, callback) => {
      const documentId = crypto.randomUUID();
      req.documentId = documentId;
      callback(null, documentId);
    },
  });

  const upload = multer({
    storage,
    limits: { files: 1, fileSize: config.maxFileSize },
    fileFilter: (req, file, callback) => {
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        callback(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'O tipo do arquivo não é permitido.'));
        return;
      }

      callback(null, true);
    },
  });

  function requireUser(req, res, next) {
    try {
      const userId = validateUserId(req.get('X-User-Id'));

      if (config.authMode === 'hmac') {
        const signature = req.get('X-User-Signature') || '';
        const expectedSignature = crypto
          .createHmac('sha256', config.userHeaderSecret)
          .update(userId)
          .digest('hex');
        const received = Buffer.from(signature, 'utf8');
        const expected = Buffer.from(expectedSignature, 'utf8');

        if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
          throw new AppError(401, 'INVALID_USER_SIGNATURE', 'A identidade do usuário não pôde ser validada.');
        }
      }

      req.userId = userId;
      next();
    } catch (error) {
      next(error);
    }
  }

  function parseUpload(req, res, next) {
    upload.single('file')(req, res, (error) => {
      if (error) {
        if (req.documentId) {
          fs.rmSync(path.join(config.storagePath, req.documentId), { force: true });
        }
        next(error);
        return;
      }

      next();
    });
  }

  router.post('/upload', requireUser, parseUpload, controller.upload);
  router.get('/documents', requireUser, controller.list);
  router.get('/documents/:id/download', requireUser, controller.download);

  return router;
}

module.exports = { createDocumentRouter };