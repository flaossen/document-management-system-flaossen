const API_PREFIX = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(url, options = {}) {
  const response = await fetch(`${API_PREFIX}${url}`, options);

  if (!response.ok) {
    throw await createApiError(response, 'REQUEST_FAILED', 'Não foi possível concluir a solicitação.');
  }

  return response;
}

export async function listDocuments(userId, options = {}) {
  const response = await request('/documents', {
    headers: { 'X-User-Id': userId },
    ...options,
  });

  return response.json();
}

export async function uploadDocument(file, userId, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: formData,
    ...options,
  });

  return response.json();
}

export async function downloadDocument(documentId, userId, options = {}) {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/download`, {
    headers: { 'X-User-Id': userId },
    ...options,
  });

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = getFileName(response.headers.get('Content-Disposition')) || 'documento';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function createApiError(response, fallbackCode, fallbackMessage) {
  let errorBody;

  try {
    errorBody = await response.json();
  } catch {
    errorBody = null;
  }

  return new ApiError(
    response.status,
    errorBody?.error?.code || fallbackCode,
    errorBody?.error?.message || fallbackMessage,
  );
}

function getFileName(contentDisposition) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}