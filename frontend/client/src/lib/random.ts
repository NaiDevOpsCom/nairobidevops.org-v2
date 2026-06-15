export function createSeededRandom(seed: number): () => number {
  let currentSeed = seed;

  return () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

// Default global instance for general use
export const seededRandom = createSeededRandom(12345);

export function seededShuffle<T>(array: T[], seed: number | (() => number)): T[] {
  const shuffled = [...array];
  const randomFn = typeof seed === "function" ? seed : createSeededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
