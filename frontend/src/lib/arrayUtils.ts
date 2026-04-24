export function swapInArray<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length || i === j) return arr.slice();
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
