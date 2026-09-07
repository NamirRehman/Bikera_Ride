export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>,
  onBatch?: (batch: T[], results: R[]) => void
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = [];
  const size = batchSize > 0 ? batchSize : items.length;
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(batch.map(worker));
    results.push(...batchResults);
    onBatch?.(batch, batchResults);
  }
  return results;
}
