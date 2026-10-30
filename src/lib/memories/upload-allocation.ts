/** A client request ID is an idempotency key, never an ownership claim. */
export function matchesUploadAllocation(
  row: { created_by: string; mime_type: string; size_bytes: number; caption: string },
  userId: string,
  input: { mime: string; size: number; caption: string },
) {
  return row.created_by === userId && row.mime_type === input.mime && row.size_bytes === input.size && row.caption === input.caption;
}
