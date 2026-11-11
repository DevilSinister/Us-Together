import { describe, expect, it } from "vitest";
import { UploadOperationError, mediaOperationResult } from "./upload-errors";

describe("media operation results", () => {
  it("defers a throttled file instead of failing it, and says why", () => {
    let error: unknown;
    try { mediaOperationResult({ error: "Too many media requests. Try again later.", status: 429 }); } catch (thrown) { error = thrown; }
    expect(error).toBeInstanceOf(UploadOperationError);
    expect(error).toMatchObject({ recoverable: true, retryAfter: 300000 });
    expect((error as Error).message).not.toMatch(/connection/i);
  });

  it("keeps the server's own retry decision for other errors", () => {
    expect(() => mediaOperationResult({ error: "Choose a smaller file.", status: 400 })).toThrow(expect.objectContaining({ recoverable: false, retryAfter: 0 }));
    expect(mediaOperationResult({ status: 200 })).toEqual({ status: 200 });
  });
});
