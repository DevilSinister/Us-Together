export class UploadOperationError extends Error {
  constructor(message: string, public readonly recoverable: boolean, public readonly retryAfter = 0, public readonly resetUpload = false) { super(message); }
}

export function mediaOperationResult<T extends { error?: string; status?: number; retryable?: boolean }>(result: T): T {
  if (result.error) throw new UploadOperationError(result.error, result.retryable ?? false, result.status === 429 ? 300000 : 0);
  return result;
}
