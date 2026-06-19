import { seededRandom } from "@/lib/random";

/**
 * Selects a random item from an array with weighted probability.
 *
 * @param items - The array of items to select from.
 * @param getWeight - A function that returns the weight (integer > 0) for a given item.
 *                    If the weight is N, the item will be N times more likely to be selected
 *                    than an item with weight 1.
 * @returns A randomly selected item, or null if the array is empty.
 */
export function getWeightedRandomItem<T>(items: T[], getWeight: (item: T) => number): T | null {
  if (!items.length) return null;

  // Create a pool where items are duplicated based on their weight
  // This is efficient for small-to-medium datasets (like gallery images)
  const pool = items.flatMap((item) => {
    const weight = Math.max(1, Math.floor(getWeight(item)));
    return Array(weight).fill(item);
  });

  const idx = Math.floor(seededRandom() * pool.length);
  return pool[idx];
}
