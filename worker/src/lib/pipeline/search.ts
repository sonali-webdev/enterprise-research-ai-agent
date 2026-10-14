// worker/src/lib/pipeline/search.ts
import { tavily } from "@tavily/core";

export interface SearchResult {
  url: string;
  title: string;
  content: string;
}

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  const response = await client.search(query, { searchDepth: "basic", maxResults });
  return response.results.map((r) => ({ url: r.url, title: r.title, content: r.content }));
}