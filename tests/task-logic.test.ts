import { describe, expect, it } from "vitest";
import {
  deriveTaskComplete,
  isTemplateDueOnDay,
  normalizeOrderedIds,
  shouldInstantiateTemplate,
  startOfLocalDay,
} from "../lib/task-logic";

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

describe("template recurrence helpers", () => {
  it("matches daily templates for any day", () => {
    const date = new Date("2026-02-07T12:00:00");
    expect(isTemplateDueOnDay({ recurrence: "DAILY", date })).toBe(true);
  });

  it("matches weekly templates only on selected days", () => {
    const monday = new Date("2026-02-09T10:00:00");
    const tuesday = new Date("2026-02-10T10:00:00");

    expect(isTemplateDueOnDay({ recurrence: "WEEKLY", weeklyDays: "MON,THU", date: monday })).toBe(true);
    expect(isTemplateDueOnDay({ recurrence: "WEEKLY", weeklyDays: "MON,THU", date: tuesday })).toBe(false);
  });

  it("skips instantiation when template already generated for the target day", () => {
    const day = startOfLocalDay(new Date("2026-02-07T15:22:00"));
    expect(
      shouldInstantiateTemplate({
        recurrence: "DAILY",
        lastGeneratedOn: day,
        targetDate: day,
      }),
    ).toBe(false);
  });
});
