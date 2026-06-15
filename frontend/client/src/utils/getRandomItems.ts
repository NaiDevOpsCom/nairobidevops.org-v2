// Utility: pick N random items from an array without mutating the original (Fisher–Yates)
import { seededRandom } from "@/lib/random";
export function getRandomItems<T>(items: T[], count: number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, count);
}

// Utility: pick a single random item from an array
export function getRandomFrom<T>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  return items[Math.floor(seededRandom() * items.length)];
}
