// Mock is-network-error for Jest
module.exports = function isNetworkError(error) {
	if (!error) return false;

	const code = error.code || error.errno;
	const networkErrorCodes = [
		"EADDRINUSE",
		"ECONNREFUSED",
		"ENOTFOUND",
		"ENETUNREACH",
		"EAI_AGAIN",
		"ETIMEDOUT",
	];

	return networkErrorCodes.includes(code);
};
