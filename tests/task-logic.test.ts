import { describe, expect, it } from "vitest";
import { deriveTaskComplete, normalizeOrderedIds } from "../lib/task-logic";

describe("deriveTaskComplete", () => {
  it("returns false when there are no steps", () => {
    expect(deriveTaskComplete([])).toBe(false);
  });

  it("returns true only when all steps are complete", () => {
    expect(deriveTaskComplete([true, true, true])).toBe(true);
    expect(deriveTaskComplete([true, false, true])).toBe(false);
  });
});

describe("normalizeOrderedIds", () => {
  it("returns ordered ids when payload matches persisted ids", () => {
    expect(normalizeOrderedIds(["a", "b", "c"], ["b", "c", "a"]))
      .toEqual(["b", "c", "a"]);
  });

  it("throws when ids do not match exactly", () => {
    expect(() => normalizeOrderedIds(["a", "b"], ["a"]))
      .toThrow("Step reorder payload does not match persisted steps.");

    expect(() => normalizeOrderedIds(["a", "b"], ["a", "x"]))
      .toThrow("Step reorder payload contains unknown step ids.");
  });
});
