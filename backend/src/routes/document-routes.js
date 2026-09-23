const crypto = require('node:crypto');
const multer = require('multer');
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
      req.userId = validateUserId(req.get('X-User-Id'));
      next();
    } catch (error) {
      next(error);
    }
  }

  router.post('/upload', requireUser, upload.single('file'), controller.upload);
  router.get('/documents', requireUser, controller.list);
  router.get('/documents/:id/download', requireUser, controller.download);

  return router;
}

module.exports = { createDocumentRouter };