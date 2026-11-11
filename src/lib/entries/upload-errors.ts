export class UploadOperationError extends Error {
  constructor(message: string, public readonly recoverable: boolean, public readonly retryAfter = 0, public readonly resetUpload = false) { super(message); }
}

export function mediaOperationResult<T extends { error?: string; status?: number; retryable?: boolean }>(result: T): T {
  if (result.status === 429) throw new UploadOperationError("You've added a lot in a short time. The rest will carry on by themselves in a few minutes.", true, 300000);
  if (result.error) throw new UploadOperationError(result.error, result.retryable ?? false);
  return result;
}
