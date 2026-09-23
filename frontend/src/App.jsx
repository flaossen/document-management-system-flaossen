import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments } from './services/api';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState('user-1');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadDocuments() {
    if (!userId.trim()) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await listDocuments(userId.trim());
      setDocuments(response.documents);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  function handleUploaded(document) {
    setDocuments((currentDocuments) => [document, ...currentDocuments]);
    setErrorMessage('');
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DMS · espaço pessoal</p>
          <h1>Seus arquivos,<br /><em>em ordem.</em></h1>
          <p className="hero-copy">Envie, encontre e baixe seus documentos em um só lugar.</p>
        </div>
        <label className="user-field">
          <span>Usuário atual</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="ex.: user-1"
            aria-label="Identificador do usuário"
          />
        </label>
      </header>

      {errorMessage && (
        <div className="alert" role="alert">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')} aria-label="Fechar alerta">×</button>
        </div>
      )}

      <div className="content-grid">
        <UploadComponent
          userId={userId.trim()}
          onUploaded={handleUploaded}
          onError={setErrorMessage}
        />
        <DocumentList
          documents={documents}
          userId={userId.trim()}
          isLoading={isLoading}
          onError={setErrorMessage}
        />
      </div>
    </main>
  );
}
