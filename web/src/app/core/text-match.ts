export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchesText(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const q = normalizeText(needle);
  if (!q) return true;
  return normalizeText(haystack).includes(q);
}
