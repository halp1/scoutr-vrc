import { useState, useCallback } from 'react';
import { initSerialport, useSerialport, Mode } from '@serserm/react-native-turbo-serialport';

const VEX_VENDOR_ID = 10376;
const BAUD_RATE = 115200;

const MODE_PACKETS: Record<string, string> = {
	autonomous: 'c936b84758c1050a0000000092 7c'.replace(/ /g, ''),
	driver: 'c936b84758c105080000000 0d6ff'.replace(/ /g, ''),
	disabled: 'c936b84758c1050b00000000382d'.replace(/ /g, '')
};

const toHex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

const PACKETS_HEX: Record<string, string> = {
	autonomous: toHex([201, 54, 184, 71, 88, 193, 5, 10, 0, 0, 0, 0, 146, 124]),
	driver: toHex([201, 54, 184, 71, 88, 193, 5, 8, 0, 0, 0, 0, 214, 255]),
	disabled: toHex([201, 54, 184, 71, 88, 193, 5, 11, 0, 0, 0, 0, 56, 45])
};

initSerialport({ autoConnect: false, mode: Mode.ASYNC });

export type ConnectedDevice = {
	deviceId: number;
	deviceName: string;
};

export const useVexSerial = () => {
	const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
	const [connecting, setConnecting] = useState(false);

	const serialport = useSerialport({
		onConnected: ({ deviceId }) => {
			setConnectedDevices((prev) => {
				if (prev.some((d) => d.deviceId === deviceId)) return prev;
				return [...prev, { deviceId, deviceName: `VEX #${deviceId}` }];
			});
		},
		onDisconnected: ({ deviceId }) => {
			setConnectedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
		},
		onError: () => {}
	});

	const connectController = useCallback(async () => {
		setConnecting(true);
		try {
			const devices = await serialport.listDevices();
			const vexDevices = devices.filter((d: any) => d.vendorId === VEX_VENDOR_ID);
			for (const device of vexDevices) {
				const alreadyConnected = connectedDevices.some((c) => c.deviceId === device.deviceId);
				if (alreadyConnected) continue;
				device.setParams({ baudRate: BAUD_RATE });
				device.connect();
			}
		} catch {}
		setConnecting(false);
	}, [serialport, connectedDevices]);

	const disconnectAll = useCallback(() => {
		try {
			serialport.disconnect();
		} catch {}
		setConnectedDevices([]);
	}, [serialport]);

	const sendMatchMode = useCallback(
		(mode: string) => {
			const hex = PACKETS_HEX[mode];
			if (!hex) return;
			for (const device of connectedDevices) {
				try {
					serialport.writeHexString(hex, device.deviceId);
				} catch {}
			}
		},
		[serialport, connectedDevices]
	);

	return { connectedDevices, connecting, connectController, disconnectAll, sendMatchMode };
};
