/**
 * Minimum number of distinct users a row split by user properties
 * (breakdowns, or group columns like platform) must represent. Smaller
 * groups are dropped and only counted. Set to 1 (only empty rows dropped)
 * while the insights are admin-only; raise it before exposing them wider.
 */
export const MIN_GROUP_SIZE = 1;

export interface SuppressionResult<T> {
  rows: T[];
  suppressedGroups: number;
}

/**
 * Drops rows that represent fewer than `minGroupSize` users.
 * `sensitiveKeys` are the group keys that split users by a user or device
 * property; without any, rows describe catalog content alone (a quest, a
 * badge) and nothing is dropped.
 *
 * Complementary suppression: for every sensitive key, rows that only differ
 * in that key form a partition whose sum the same insight without that key
 * returns. If a partition hides a single row, or hidden rows that together
 * represent fewer than `minGroupSize` users, the smallest visible
 * rows are hidden too, so the dropped values cannot be recovered by
 * subtraction. Repeats until stable, because hiding a row in one partition
 * can expose another.
 */
export function suppressSmallGroups<
  T extends { group: Record<string, unknown> },
>(
  rows: T[],
  usersOf: (row: T) => number,
  sensitiveKeys: readonly string[],
  minGroupSize = MIN_GROUP_SIZE,
): SuppressionResult<T> {
  if (sensitiveKeys.length === 0) return { rows, suppressedGroups: 0 };

  const hidden = new Set(rows.filter((row) => usersOf(row) < minGroupSize));
  let changed = hidden.size > 0;
  while (changed) {
    changed = false;
    for (const key of sensitiveKeys) {
      for (const partition of partitionsWithout(rows, key)) {
        if (hideComplements(partition, hidden, usersOf, minGroupSize))
          changed = true;
      }
    }
  }

  return {
    rows: rows.filter((row) => !hidden.has(row)),
    suppressedGroups: hidden.size,
  };
}

/** Groups rows by every group key except `key`. */
function partitionsWithout<T extends { group: Record<string, unknown> }>(
  rows: T[],
  key: string,
): T[][] {
  const partitions = new Map<string, T[]>();
  for (const row of rows) {
    const id = JSON.stringify(
      Object.entries(row.group)
        .filter(([column]) => column !== key)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    const partition = partitions.get(id);
    if (partition) partition.push(row);
    else partitions.set(id, [row]);
  }
  return [...partitions.values()];
}

/** Hides the smallest visible rows until the hidden part is safe. */
function hideComplements<T>(
  partition: T[],
  hidden: Set<T>,
  usersOf: (row: T) => number,
  minGroupSize: number,
): boolean {
  const hiddenRows = partition.filter((row) => hidden.has(row));
  if (hiddenRows.length === 0) return false;
  const visible = partition
    .filter((row) => !hidden.has(row))
    .sort((a, b) => usersOf(a) - usersOf(b));

  let count = hiddenRows.length;
  let users = hiddenRows.reduce((sum, row) => sum + usersOf(row), 0);
  let changed = false;
  while ((count < 2 || users < minGroupSize) && visible.length > 0) {
    const row = visible.shift() as T;
    hidden.add(row);
    count += 1;
    users += usersOf(row);
    changed = true;
  }
  return changed;
}
