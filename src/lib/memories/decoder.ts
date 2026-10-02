/** Share initialization across sequential and overlapping requests in one worker. */
export function sharedDecoder<T>(initialize: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= initialize().catch(error => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}
