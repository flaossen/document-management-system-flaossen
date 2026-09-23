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

  toPublicDocument(document) {
    const { filePath, mimeType, ...publicDocument } = document;
    return publicDocument;
  }
}

module.exports = { DocumentRepository };