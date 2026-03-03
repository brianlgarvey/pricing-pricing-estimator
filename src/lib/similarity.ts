import type { Proposal } from "./csvParser";

// Stopwords to filter out common English words
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "that", "this", "are", "was",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "not", "no", "we", "you",
  "i", "he", "she", "they", "them", "our", "your", "my", "its",
  "as", "if", "so", "up", "out", "about", "into", "over", "after",
  "all", "also", "been", "being", "more", "some", "such", "than",
  "very", "just", "only", "other", "new", "one", "two", "each",
  "any", "how", "what", "which", "when", "where", "who", "their",
  "then", "these", "those", "through", "while", "here", "there",
  "need", "looking", "want", "like", "get", "make", "us", "me",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

type TfIdfVector = Map<string, number>;

function computeTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

export interface TfIdfCorpus {
  documentVectors: TfIdfVector[];
  idf: Map<string, number>;
  proposals: Proposal[];
}

export function buildCorpus(proposals: Proposal[]): TfIdfCorpus {
  const N = proposals.length;
  const docFreq = new Map<string, number>();
  const allTokens: string[][] = [];

  // Tokenize all documents and compute document frequencies
  for (const p of proposals) {
    const text = `${p.job_title} ${p.job_description}`;
    const tokens = tokenize(text);
    const uniqueTerms = new Set(tokens);
    allTokens.push(tokens);

    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  // Compute IDF
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log(N / (1 + df)));
  }

  // Build TF-IDF vectors
  const documentVectors: TfIdfVector[] = allTokens.map((tokens) => {
    const tf = computeTf(tokens);
    const tfidf: TfIdfVector = new Map();
    for (const [term, tfVal] of tf) {
      const idfVal = idf.get(term) || 0;
      tfidf.set(term, tfVal * idfVal);
    }
    return tfidf;
  });

  return { documentVectors, idf, proposals };
}

function queryToVector(query: string, idf: Map<string, number>): TfIdfVector {
  const tokens = tokenize(query);
  const tf = computeTf(tokens);
  const tfidf: TfIdfVector = new Map();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || 0;
    tfidf.set(term, tfVal * idfVal);
  }
  return tfidf;
}

function cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, val] of a) {
    normA += val * val;
    const bVal = b.get(term) || 0;
    dotProduct += val * bVal;
  }

  for (const [, val] of b) {
    normB += val * val;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export interface SimilarMatch {
  proposal: Proposal;
  similarity: number;
}

export function findSimilar(
  query: string,
  corpus: TfIdfCorpus,
  minSimilarity: number = 0.05,
  maxMatches: number = 50
): SimilarMatch[] {
  const queryVec = queryToVector(query, corpus.idf);

  const scored: SimilarMatch[] = corpus.documentVectors
    .map((docVec, i) => ({
      proposal: corpus.proposals[i],
      similarity: cosineSimilarity(queryVec, docVec),
    }))
    .filter((m) => m.similarity >= minSimilarity);

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, maxMatches);
}
