import DownloadButton from './DownloadButton';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export default function DocumentList({ documents, userId, isLoading, onError }) {
  return (
    <section className="document-section" aria-labelledby="documents-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2 id="documents-title">Seus documentos</h2>
        </div>
        <span className="document-count">{documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
      </div>

      {isLoading && <p className="empty-state">Carregando documentos...</p>}
      {!isLoading && documents.length === 0 && (
        <p className="empty-state">Nenhum documento enviado ainda.</p>
      )}
      {!isLoading && documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <div className="document-icon" aria-hidden="true">DOC</div>
              <div className="document-info">
                <strong>{document.originalName}</strong>
                <span>{formatFileSize(document.size)} · {formatDate(document.uploadedAt)}</span>
              </div>
              <DownloadButton
                documentId={document.id}
                userId={userId}
                fileName={document.originalName}
                onError={onError}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}