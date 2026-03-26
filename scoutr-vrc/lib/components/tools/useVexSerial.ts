import { useCallback } from 'react';

export type ConnectedDevice = {
	deviceId: number;
	deviceName: string;
};

export const useVexSerial = () => {
	const noop = useCallback(() => {}, []);
	const noopAsync = useCallback(async () => {}, []);

	return {
		connectedDevices: [] as ConnectedDevice[],
		connecting: false,
		connectController: noopAsync,
		disconnectAll: noopAsync,
		sendMatchMode: noop as (mode: string) => void
	};
};
