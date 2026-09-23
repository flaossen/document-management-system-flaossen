const { AppError } = require('../errors');

class DocumentController {
  constructor({ service }) {
    this.service = service;
    this.upload = this.upload.bind(this);
    this.list = this.list.bind(this);
    this.download = this.download.bind(this);
  }

  upload(req, res, next) {
    try {
      const document = this.service.createDocument({
        file: req.file,
        documentId: req.documentId,
        owner: req.userId,
      });

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }

  list(req, res, next) {
    try {
      res.json({ documents: this.service.listDocuments(req.userId) });
    } catch (error) {
      next(error);
    }
  }

  download(req, res, next) {
    try {
      if (!req.params.id || /[\\/]|\.\.|\u0000/.test(req.params.id)) {
        throw new AppError(400, 'INVALID_DOCUMENT_ID', 'O identificador do documento é inválido.');
      }

      const document = this.service.getDownload(req.params.id, req.userId);
      res.type(document.mimeType || 'application/octet-stream');
      res.download(document.filePath, document.originalName, (error) => {
        if (error && !res.headersSent) {
          next(new AppError(500, 'STORAGE_ERROR', 'Não foi possível baixar o documento.'));
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { DocumentController };