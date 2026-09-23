const express = require('express');
const multer = require('multer');
const { DocumentController } = require('./controllers/document-controller');
const { DocumentRepository } = require('./repositories/document-repository');
const { createDocumentRouter } = require('./routes/document-routes');
const { DocumentService } = require('./services/document-service');
const { getConfig } = require('./config');

function createApp(providedConfig = getConfig()) {
  const app = express();
  const repository = new DocumentRepository({ storagePath: providedConfig.storagePath });
  const service = new DocumentService({
    repository,
    maxFileSize: providedConfig.maxFileSize,
    allowedMimeTypes: providedConfig.allowedMimeTypes,
  });
  const controller = new DocumentController({ service });

  app.use(express.json());
  app.use(createDocumentRouter({ config: providedConfig, controller }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE';
      res.status(status).json({ error: { code, message: 'O upload não pôde ser processado.' } });
      return;
    }

    const status = error.status || 500;
    const code = error.code || 'INTERNAL_ERROR';
    const message = error.status ? error.message : 'Ocorreu um erro interno.';
    res.status(status).json({ error: { code, message } });
  });

  return app;
}

const config = getConfig();
const app = createApp(config);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
