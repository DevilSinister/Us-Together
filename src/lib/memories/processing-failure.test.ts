import { describe, expect, it } from "vitest";
import { processingFailure } from "./processing-failure";
describe("private processor diagnostics", () => {
  it("never emits raw messages, unknown stages, identifiers or file paths", () => {
    expect(processingFailure("private-path", Error("secret-photo.jpg token=private"))).toEqual({stage:"unknown", category:"unknown"});
    expect(processingFailure("decode", Error("ICC profile private-path"))).toEqual({stage:"decode", category:"color-profile"});
    expect(processingFailure("decoder", Error("WebAssembly unreachable secret"))).toEqual({stage:"decoder", category:"wasm"});
    expect(processingFailure("decode", {message:"secret"})).toEqual({stage:"decode", category:"unknown"});
  });
});
