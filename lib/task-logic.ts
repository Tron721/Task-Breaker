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
