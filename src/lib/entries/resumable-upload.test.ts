import { createServer, type IncomingMessage } from "node:http";
import { once } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { Upload } from "tus-js-client";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { resumableAuthOptions, uploadFailure } from "./resumable-upload";

describe("real resumable transfer recovery", () => {
  it("refreshes expired credentials, recovers a lost PATCH response from server offset, and respects throttling", async () => {
    let token = "first", offset = 0, creations = 0, refreshed = 0, lostResponse = false, throttled = false;
    const input = Buffer.alloc(13 * 1024 * 1024, 42);
    const accepted: Buffer[] = [], methods: string[] = [], credentials: string[] = [], offsets: number[] = [];
    const body = async (request: IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(chunk); return Buffer.concat(chunks); };
    const server = createServer(async (request, response) => {
      methods.push(request.method!); credentials.push(request.headers.authorization!);
      response.setHeader("Tus-Resumable", "1.0.0");
      if (request.method === "POST") {
        creations++; const chunk = await body(request); accepted.push(chunk); offset += chunk.length;
        token = "expired";
        response.writeHead(201, { Location: "/upload/fictional", "Upload-Offset": String(offset) }).end();
      } else if (request.headers.authorization === "Bearer expired") {
        response.writeHead(401).end();
      } else if (request.method === "HEAD") {
        offsets.push(offset); response.writeHead(200, { "Upload-Offset": String(offset), "Upload-Length": String(input.length) }).end();
      } else if (!throttled) {
        throttled = true; response.writeHead(429).end();
      } else {
        expect(Number(request.headers["upload-offset"])).toBe(offset);
        const chunk = await body(request); accepted.push(chunk); offset += chunk.length;
        if (!lostResponse) { lostResponse = true; request.socket.destroy(); }
        else response.writeHead(204, { "Upload-Offset": String(offset) }).end();
      }
    });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); if (!address || typeof address === "string") throw Error("Test server unavailable");
    try {
      const options = resumableAuthOptions({
        getSession: async () => ({ data: { session: { access_token: token } }, error: null }),
        refreshSession: async () => { refreshed++; token = "fresh"; return { data: { session: { access_token: token } }, error: null }; },
      });
      await new Promise<void>((resolve, reject) => new Upload(input, {
        ...options, retryDelays: [0, 0, 0, 0, 0], endpoint: `http://127.0.0.1:${address.port}/upload`,
        chunkSize: 6 * 1024 * 1024, uploadDataDuringCreation: true, storeFingerprintForResuming: false,
        onSuccess: () => resolve(), onError: reject,
      }).start());
      expect(Buffer.concat(accepted).equals(input)).toBe(true);
      expect(creations).toBe(1); expect(refreshed).toBe(1);
      expect(methods).toContain("HEAD"); expect(offsets).toContain(12 * 1024 * 1024);
      expect(credentials).toContain("Bearer fresh");
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });

  it("uses the new session after a long pause and refreshes near expiry", async () => {
    let token = "first";
    const refreshSession = vi.fn(async () => ({ data: { session: { access_token: "renewed" } }, error: null }));
    const options = resumableAuthOptions({ getSession: async () => ({ data: { session: { access_token: token, expires_at: token === "expiring" ? Date.now() / 1000 : undefined } }, error: null }), refreshSession });
    const setHeader = vi.fn();
    const request = { setHeader } as unknown as Parameters<NonNullable<typeof options.onBeforeRequest>>[0];
    await options.onBeforeRequest!(request); token = "after-pause"; await options.onBeforeRequest!(request);
    expect(setHeader).toHaveBeenLastCalledWith("authorization", "Bearer after-pause");
    token = "expiring"; await options.onBeforeRequest!(request);
    expect(setHeader).toHaveBeenLastCalledWith("authorization", "Bearer renewed"); expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not retry a missing session or leak private error details", async () => {
    const options = resumableAuthOptions({ getSession: async () => ({ data: { session: null }, error: null }), refreshSession: vi.fn() });
    let failure: Error | undefined;
    try { await options.onBeforeRequest!({ setHeader: vi.fn() } as unknown as Parameters<NonNullable<typeof options.onBeforeRequest>>[0]); } catch (error) { failure = error as Error; }
    expect(uploadFailure(failure!).recoverable).toBe(false);
    for (const status of [400, 401, 403, 413]) {
      const error = Object.assign(Error("private-url?token=secret"), { originalResponse: { getStatus: () => status } });
      expect(uploadFailure(error).recoverable).toBe(false); expect(uploadFailure(error).message).not.toContain("secret");
    }
    for (const status of [0, 408, 409, 423, 429, 500, 503]) expect(uploadFailure(Object.assign(Error(), { originalResponse: { getStatus: () => status } })).recoverable).toBe(true);
  });

  it("preserves retryable auth outages as connection failures and resumes with a fresh credential", async () => {
    const outage = new AuthRetryableFetchError("private auth response", 503);
    const getSession = vi.fn().mockResolvedValueOnce({ data: { session: null }, error: outage }).mockResolvedValue({ data: { session: { access_token: "after-reconnection" } }, error: null });
    const options = resumableAuthOptions({ getSession, refreshSession: vi.fn() });
    const setHeader = vi.fn(), request = { setHeader } as unknown as Parameters<NonNullable<typeof options.onBeforeRequest>>[0];
    await expect(options.onBeforeRequest!(request)).rejects.toBe(outage);
    expect(uploadFailure(outage).recoverable).toBe(true); expect(uploadFailure(outage).message).not.toContain("private");
    await options.onBeforeRequest!(request);
    expect(setHeader).toHaveBeenCalledWith("authorization", "Bearer after-reconnection");
  });
});
