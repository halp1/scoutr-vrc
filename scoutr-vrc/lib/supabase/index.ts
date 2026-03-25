import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { CONSTANTS } from '../const';

const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
	getItem: async (key: string) => {
		const chunkCount = await SecureStore.getItemAsync(`${key}.chunks`);
		if (chunkCount) {
			const n = parseInt(chunkCount, 10);
			const parts = await Promise.all(
				Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`))
			);
			if (parts.some((p) => p === null)) return null;
			return parts.join('');
		}
		return SecureStore.getItemAsync(key);
	},
	setItem: async (key: string, value: string) => {
		if (value.length > CHUNK_SIZE) {
			const n = Math.ceil(value.length / CHUNK_SIZE);
			await Promise.all(
				Array.from({ length: n }, (_, i) =>
					SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
				)
			);
			await SecureStore.setItemAsync(`${key}.chunks`, String(n));
			await SecureStore.deleteItemAsync(key).catch(() => {});
		} else {
			await SecureStore.setItemAsync(key, value);
			await SecureStore.deleteItemAsync(`${key}.chunks`).catch(() => {});
		}
	},
	removeItem: async (key: string) => {
		const chunkCount = await SecureStore.getItemAsync(`${key}.chunks`);
		if (chunkCount) {
			const n = parseInt(chunkCount, 10);
			await Promise.all([
				...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
				SecureStore.deleteItemAsync(`${key}.chunks`)
			]);
		} else {
			await SecureStore.deleteItemAsync(key);
		}
	}
};

export const supabase = createClient(CONSTANTS.SUPABASE_URL, CONSTANTS.SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		storage: ExpoSecureStoreAdapter,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false
	}
});
