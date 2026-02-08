// Mock p-limit for Jest (ESM compatibility)
export default function pLimit(_concurrency: number) {
	return async <T>(fn: () => Promise<T> | T): Promise<T> => {
		return Promise.resolve(fn());
	};
}
