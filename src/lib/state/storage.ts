import { load, type Store } from '@tauri-apps/plugin-store';
import { writable } from 'svelte/store';

import { merge } from 'lodash-es';
import type { Session } from '@supabase/supabase-js';

let store: Store | null = null;

let readyResolve: () => void = undefined as any;

export const ready = new Promise<void>((resolve) => {
	readyResolve = resolve;
});

export interface Storage {
	team: string | null;
	program: number | null;

	auth: Session | null;

	onboarding: {
		intro: boolean;
		team: boolean;
		account: boolean;
	};

	current: {
		event: number | null;
	};

	favorites: {
		teams: number[];
		events: number[];
	};
}

export const defaultStorage: Storage = {
	team: null,
	program: null,

	auth: null,

	onboarding: {
		intro: false,
		team: false,
		account: false
	},

	current: {
		event: null
	},

	favorites: {
		teams: [],
		events: []
	}
};

export const storage = writable<Storage>(null as any);

await load('store.json', {
	autoSave: true,
	defaults: {}
}).then(async (s) => {
	store = s;
	storage.set(merge({}, defaultStorage, await store.get<Storage>('storage')));
	readyResolve();
});

storage.subscribe((value) => {
	store?.set('storage', value);
});

window.__devhooks__.resetStorage = async () => {
	await store?.clear();
	storage.set(defaultStorage);
};
