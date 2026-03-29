declare global {
	interface Window {
		__devhooks__: Record<string, any>;
	}
}
