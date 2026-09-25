import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Before React hydrates, a <form> is plain HTML. One handled only by onSubmit,
 * with no method, is a GET form, and a tap that lands early puts every field -
 * an idea's title, a note, a tag - into the URL, where history, logs and
 * referrers keep it. Every form must say how it submits: a server `action`, or
 * `method="post"`, which at worst sends the fields in a request body.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? tsxFiles(full) : entry.name.endsWith(".tsx") ? [full] : [];
  });
}

describe("forms never fall back to GET", () => {
  it("gives every <form> an action or method", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const offenders = tsxFiles(root).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(/<form\b([\s\S]*?)>/g)]
        .filter((match) => !/\b(action|method)=/.test(match[1]))
        .map((match) => `${path.relative(root, file)}:${source.slice(0, match.index).split("\n").length}`);
    });
    expect(offenders).toEqual([]);
  });
});
