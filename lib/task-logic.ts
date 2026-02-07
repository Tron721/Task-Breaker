import { type RecurrenceType, type TaskStatus, type WeeklyDay } from "@/lib/types";

export function deriveTaskComplete(stepCompletion: boolean[]): boolean {
  if (stepCompletion.length === 0) {
    return false;
  }
  return stepCompletion.every(Boolean);
}

export function normalizeOrderedIds(allIds: string[], orderedIds: string[]): string[] {
  const idSet = new Set(allIds);
  const incomingSet = new Set(orderedIds);

  if (idSet.size !== incomingSet.size || orderedIds.length !== allIds.length) {
    throw new Error("Step reorder payload does not match persisted steps.");
  }

  for (const id of orderedIds) {
    if (!idSet.has(id)) {
      throw new Error("Step reorder payload contains unknown step ids.");
    }
  }

  return orderedIds;
}

const WEEKDAY_ORDER: WeeklyDay[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

export function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseWeeklyDays(value?: string | null): WeeklyDay[] {
  if (!value || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is WeeklyDay => WEEKDAY_ORDER.includes(item as WeeklyDay));
}

export function serializeWeeklyDays(days: WeeklyDay[]): string {
  const uniqueDays = Array.from(new Set(days))
    .filter((day) => WEEKDAY_ORDER.includes(day))
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  return uniqueDays.join(",");
}

export function isTemplateDueOnDay(input: {
  recurrence: RecurrenceType;
  weeklyDays?: string | null;
  date: Date;
}): boolean {
  if (input.recurrence === "NONE") {
    return false;
  }

  if (input.recurrence === "DAILY") {
    return true;
  }

  const selectedDays = parseWeeklyDays(input.weeklyDays);
  if (selectedDays.length === 0) {
    return false;
  }

  const day = WEEKDAY_ORDER[input.date.getDay()];
  return selectedDays.includes(day);
}

export function shouldInstantiateTemplate(input: {
  recurrence: RecurrenceType;
  weeklyDays?: string | null;
  lastGeneratedOn?: Date | null;
  targetDate: Date;
}): boolean {
  if (!isTemplateDueOnDay(input)) {
    return false;
  }

  if (!input.lastGeneratedOn) {
    return true;
  }

  return localDateKey(input.lastGeneratedOn) !== localDateKey(input.targetDate);
}

export function normalizeTaskStatus(input: { status?: TaskStatus; isComplete: boolean }): TaskStatus {
  if (input.isComplete) {
    return "DONE";
  }
  return input.status && input.status !== "DONE" ? input.status : "NEXT";
}

export function normalizeTaskCompletion(status: TaskStatus): boolean {
  return status === "DONE";
}

export function groupTasksByStatus<T extends { status: TaskStatus }>(tasks: T[]) {
  return {
    now: tasks.filter((task) => task.status === "NOW"),
    next: tasks.filter((task) => task.status === "NEXT"),
    later: tasks.filter((task) => task.status === "LATER"),
    done: tasks.filter((task) => task.status === "DONE"),
  };
}
