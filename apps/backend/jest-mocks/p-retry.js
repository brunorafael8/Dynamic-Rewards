// Mock p-retry for Jest
class AbortError extends Error {
	constructor(message) {
		super(message);
		this.name = "AbortError";
	}
}

// Simple passthrough implementation of p-retry
module.exports = async function pRetry(fn, options) {
	let lastError;
	const maxRetries = (options && options.retries) || 3;

	for (let i = 0; i <= maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (i === maxRetries) {
				throw error;
			}
		}
	}

	throw lastError;
};

module.exports.AbortError = AbortError;
