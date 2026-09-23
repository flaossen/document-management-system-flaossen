import { useState } from 'react';
import { uploadDocument } from '../services/api';

export default function UploadComponent({ userId, onUploaded, onError }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      onError('Selecione um arquivo antes de enviar.');
      return;
    }

    setIsUploading(true);

    try {
      const document = await uploadDocument(file, userId);
      setFile(null);
      event.target.reset();
      onUploaded(document);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Novo documento</p>
        <h2>Envie um arquivo</h2>
        <p className="muted">PDF, texto ou imagem, com até 10 MiB.</p>
      </div>
      <label className="file-picker">
        <span>{file ? file.name : 'Escolher arquivo'}</span>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={isUploading}
        />
      </label>
      <button className="primary-button" type="submit" disabled={isUploading || !userId}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}