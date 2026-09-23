const fs = require('node:fs');
const path = require('node:path');

class DocumentRepository {
  constructor({ storagePath }) {
    this.storagePath = storagePath;
    this.documents = new Map();
    fs.mkdirSync(this.storagePath, { recursive: true });
  }

  save(document) {
    this.documents.set(document.id, document);
    return this.toPublicDocument(document);
  }

  removeFile(documentId) {
    const filePath = this.getFilePath(documentId);

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  validateFileContent(file, allowedMimeTypes) {
    const signatures = {
      'application/pdf': (header) => header.toString('ascii', 0, 5) === '%PDF-',
      'image/png': (header) => header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
    };
    const signatureCheck = signatures[file.mimetype];

    if (!allowedMimeTypes.includes(file.mimetype) || !signatureCheck) {
      return true;
    }

    const fileDescriptor = fs.openSync(file.path, 'r');
    const header = Buffer.alloc(16);

    try {
      fs.readSync(fileDescriptor, header, 0, header.length, 0);
    } finally {
      fs.closeSync(fileDescriptor);
    }

    return signatureCheck(header);
  }

  findByIdAndOwner(id, owner) {
    const document = this.documents.get(id);

    if (!document || document.owner !== owner) {
      return null;
    }

    return document;
  }

  listByOwner(owner) {
    return [...this.documents.values()]
      .filter((document) => document.owner === owner)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
      .map((document) => this.toPublicDocument(document));
  }

  getFilePath(id) {
    return path.join(this.storagePath, id);
  }

  fileExists(id) {
    return fs.existsSync(this.getFilePath(id));
  }

  toPublicDocument(document) {
    const { filePath, mimeType, ...publicDocument } = document;
    return publicDocument;
  }
}

module.exports = { DocumentRepository };