const path = require('node:path');
const { AppError } = require('../errors');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function validateDocumentId(documentId) {
  if (typeof documentId !== 'string' || !UUID_PATTERN.test(documentId)) {
    throw new AppError(400, 'INVALID_DOCUMENT_ID', 'O identificador do documento é inválido.');
  }

  return documentId;
}

function validateFileSignature(repository, file, allowedMimeTypes) {
  if (!repository.validateFileContent(file, allowedMimeTypes)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'O conteúdo do arquivo não corresponde ao tipo informado.');
  }
}

class DocumentService {
  constructor({ repository, maxFileSize, allowedMimeTypes }) {
    this.repository = repository;
    this.maxFileSize = maxFileSize;
    this.allowedMimeTypes = allowedMimeTypes;
  }

  createDocument({ file, documentId, owner }) {
    const normalizedOwner = validateUserId(owner);

    try {
      if (!file) {
        throw new AppError(400, 'MISSING_FILE', 'O arquivo é obrigatório.');
      }

      if (!file.size) {
        throw new AppError(400, 'INVALID_FILE', 'O arquivo não pode estar vazio.');
      }

      if (file.size > this.maxFileSize) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido.');
      }

      validateFileSignature(this.repository, file, this.allowedMimeTypes);

      const document = {
        id: validateDocumentId(documentId),
        originalName: normalizeOriginalName(file.originalname),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: normalizedOwner,
        mimeType: file.mimetype,
      };

      return this.repository.save(document);
    } catch (error) {
      if (file) {
        this.repository.removeFile(documentId);
      }
      throw error;
    }
  }

  listDocuments(owner) {
    return this.repository.listByOwner(validateUserId(owner));
  }

  getDownload(documentId, owner) {
    const normalizedOwner = validateUserId(owner);
    const normalizedDocumentId = validateDocumentId(documentId);
    const document = this.repository.findByIdAndOwner(normalizedDocumentId, normalizedOwner);

    if (!document) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    if (!this.repository.fileExists(document.id)) {
      throw new AppError(410, 'FILE_NOT_AVAILABLE', 'O arquivo não está disponível.');
    }

    return { ...document, filePath: this.repository.getFilePath(document.id) };
  }
}

module.exports = {
  DocumentService,
  normalizeOriginalName,
  validateDocumentId,
  validateUserId,
};