const API_PREFIX = '/api';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(`${API_PREFIX}${url}`, options);

  if (!response.ok) {
    let errorBody;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    throw new ApiError(
      response.status,
      errorBody?.error?.code || 'REQUEST_FAILED',
      errorBody?.error?.message || 'Não foi possível concluir a solicitação.',
    );
  }

  return response.json();
}

export function listDocuments(userId) {
  return requestJson('/documents', {
    headers: { 'X-User-Id': userId },
  });
}

export function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  return requestJson('/upload', {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: formData,
  });
}

export async function downloadDocument(documentId, userId) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(documentId)}/download`, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    let errorBody;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    throw new ApiError(
      response.status,
      errorBody?.error?.code || 'DOWNLOAD_FAILED',
      errorBody?.error?.message || 'Não foi possível baixar o documento.',
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = getFileName(response.headers.get('Content-Disposition')) || 'documento';
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function getFileName(contentDisposition) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}