const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { AppError } = require('../errors');

function normalizeOriginalName(originalName) {
  const fileName = path.basename(String(originalName || '').replaceAll('\\', '/'));
  const normalizedName = fileName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return normalizedName || 'document';
}

function validateUserId(userId) {
  if (typeof userId !== 'string' || !userId.trim() || userId.length > 100 || /[\u0000-\u001f\u007f]/.test(userId)) {
    throw new AppError(400, 'MISSING_USER', 'O identificador do usuário é obrigatório.');
  }

  return userId.trim();
}

class DocumentService {
  constructor({ repository, maxFileSize }) {
    this.repository = repository;
    this.maxFileSize = maxFileSize;
  }

  createDocument({ file, documentId, owner }) {
    const normalizedOwner = validateUserId(owner);

    if (!file) {
      throw new AppError(400, 'MISSING_FILE', 'O arquivo é obrigatório.');
    }

    if (!file.size) {
      throw new AppError(400, 'INVALID_FILE', 'O arquivo não pode estar vazio.');
    }

    if (file.size > this.maxFileSize) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido.');
    }

    const document = {
      id: documentId,
      originalName: normalizeOriginalName(file.originalname),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: normalizedOwner,
      mimeType: file.mimetype,
      filePath: file.path,
    };

    try {
      return this.repository.save(document);
    } catch (error) {
      this.removeFile(file.path);
      throw error;
    }
  }

  listDocuments(owner) {
    return this.repository.listByOwner(validateUserId(owner));
  }

  getDownload(documentId, owner) {
    const normalizedOwner = validateUserId(owner);
    const document = this.repository.findByIdAndOwner(documentId, normalizedOwner);

    if (!document) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    if (!fs.existsSync(document.filePath)) {
      throw new AppError(410, 'FILE_NOT_AVAILABLE', 'O arquivo não está disponível.');
    }

    return document;
  }

  removeFile(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // A limpeza é best effort; o erro original deve ser preservado.
    }
  }
}

module.exports = { DocumentService, normalizeOriginalName, validateUserId };