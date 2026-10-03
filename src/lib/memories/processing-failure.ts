/** Only fixed categories may enter logs; never include raw decoder errors or IDs. */
export function processingFailure(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const category = /memory|allocation|out of bounds/i.test(message) ? "memory"
    : /profile|icc|colorspace/i.test(message) ? "color-profile"
    : /abort|unreachable|wasm|webassembly/i.test(message) ? "wasm"
    : /unsupported|delegate|not implemented/i.test(message) ? "unsupported"
    : /corrupt|invalid|improper|insufficient|unexpected end/i.test(message) ? "invalid-image"
    : /fetch|network|connection/i.test(message) ? "network"
    : "unknown";
  const stages = ["download", "inspect", "decoder", "decode", "orient", "resize", "encode", "preview-storage", "authorization", "publish"];
  return { stage: stages.includes(stage) ? stage : "unknown", category };
}
