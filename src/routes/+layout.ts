// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const ssr = false;

declare global {
	interface Window {
		__devhooks__: Record<string, any>;
		fetchCORS: typeof fetch;
		fetchNative: typeof fetch;
	}
}

window.fetch = window.fetchNative;

window.__devhooks__ = {};
