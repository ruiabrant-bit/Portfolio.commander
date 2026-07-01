/**
 * FNV-1a hash — deterministic, synchronous, good enough for de-duplication
 * (not a security primitive). Used to compute `importHash` for CSV rows so
 * re-importing the same file never creates duplicate records (PRD v1.2 §1).
 */
export function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
