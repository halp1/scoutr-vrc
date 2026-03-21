declare global {
	interface Window {
		__devhooks__: Record<string, any>;
		fetchCORS: typeof fetch;
		fetchNative: typeof fetch;
	}
}
