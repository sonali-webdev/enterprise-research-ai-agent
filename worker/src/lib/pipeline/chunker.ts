// worker/src/lib/pipeline/chunker.ts
export function chunkText(text: string, maxChars = 500): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const lastSpace = cleaned.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(cleaned.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}