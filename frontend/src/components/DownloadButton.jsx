import { useState } from 'react';
import { downloadDocument } from '../services/api';

export default function DownloadButton({ documentId, userId, fileName, onError }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      await downloadDocument(documentId, userId);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className="download-button"
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      aria-label={`Baixar ${fileName}`}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}