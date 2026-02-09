/**
 * Semantic LLM Cache with Embeddings
 *
 * Caches LLM responses using semantic similarity:
 * - Converts prompts to embeddings
 * - Finds similar cached prompts using cosine similarity
 * - Returns cached result if similarity > threshold
 * - Massive cost savings for similar queries
 *
 * Example: "Is this good?" ≈ "Is this high quality?" = cache hit
 */

import { generateText } from "ai";
import { getModel } from "./ai-provider";
import type { LLMEvaluation } from "./types";

interface CacheEntry {
	promptEmbedding: number[];
	prompt: string;
	fieldValue: string;
	result: LLMEvaluation;
	timestamp: Date;
	hits: number;
}

// In-memory cache (for demo - in production use Redis with vector search)
const cache = new Map<string, CacheEntry>();

const SIMILARITY_THRESHOLD = 0.85; // 85% similar = cache hit
const CACHE_TTL_MS = 3600000; // 1 hour

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple embedding function using character trigrams (cheap, fast, offline)
 * For production: use OpenAI text-embedding-3-small or Anthropic embeddings
 */
function fastEmbedding(text: string): number[] {
	const normalized = text.toLowerCase().trim();
	const trigrams = new Map<string, number>();

	// Extract character trigrams
	for (let i = 0; i < normalized.length - 2; i++) {
		const trigram = normalized.slice(i, i + 3);
		trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
	}

	// Convert to fixed-size vector (128 dimensions)
	const vector = new Array(128).fill(0);
	for (const [trigram, count] of trigrams) {
		// Simple hash to dimension
		const hash = Array.from(trigram).reduce(
			(acc, char) => acc + char.charCodeAt(0),
			0,
		);
		const idx = hash % 128;
		vector[idx] += count;
	}

	// Normalize vector
	const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
	return norm > 0 ? vector.map((val) => val / norm) : vector;
}

/**
 * Check cache for similar prompt
 */
export function checkCache(
	prompt: string,
	fieldValue: string,
): LLMEvaluation | null {
	const promptEmbedding = fastEmbedding(prompt);

	// Find most similar cached entry
	let bestMatch: CacheEntry | null = null;
	let bestSimilarity = 0;

	for (const entry of cache.values()) {
		// Skip expired entries
		if (Date.now() - entry.timestamp.getTime() > CACHE_TTL_MS) {
			continue;
		}

		// Check if field value is similar (exact match for now)
		if (entry.fieldValue !== fieldValue) continue;

		const similarity = cosineSimilarity(promptEmbedding, entry.promptEmbedding);
		if (similarity > bestSimilarity) {
			bestSimilarity = similarity;
			bestMatch = entry;
		}
	}

	// Cache hit if similarity above threshold
	if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
		bestMatch.hits++;
		console.log(
			`[Cache HIT] Similarity: ${(bestSimilarity * 100).toFixed(1)}% | "${prompt}" ≈ "${bestMatch.prompt}"`,
		);
		return bestMatch.result;
	}

	return null;
}

/**
 * Store result in cache
 */
export function storeInCache(
	prompt: string,
	fieldValue: string,
	result: LLMEvaluation,
): void {
	const promptEmbedding = fastEmbedding(prompt);
	const key = `${prompt}:${fieldValue}`;

	cache.set(key, {
		promptEmbedding,
		prompt,
		fieldValue,
		result,
		timestamp: new Date(),
		hits: 0,
	});
}

/**
 * Get cache stats
 */
export function getCacheStats() {
	const entries = Array.from(cache.values());
	const validEntries = entries.filter(
		(e) => Date.now() - e.timestamp.getTime() <= CACHE_TTL_MS,
	);

	return {
		totalEntries: cache.size,
		validEntries: validEntries.length,
		totalHits: validEntries.reduce((sum, e) => sum + e.hits, 0),
		avgHitsPerEntry:
			validEntries.length > 0
				? validEntries.reduce((sum, e) => sum + e.hits, 0) / validEntries.length
				: 0,
		cacheSize: validEntries.length,
	};
}

/**
 * Clear expired entries
 */
export function clearExpiredCache(): void {
	const now = Date.now();
	for (const [key, entry] of cache.entries()) {
		if (now - entry.timestamp.getTime() > CACHE_TTL_MS) {
			cache.delete(key);
		}
	}
}

/**
 * Clear all cache
 */
export function clearCache(): void {
	cache.clear();
}
