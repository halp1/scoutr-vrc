import { useState, useCallback, useRef } from "react";
import { BleManager, Device, State } from "react-native-ble-plx";

const SERVICE_UUID = "08590f7e-db05-467e-8757-72f6faeb13d5";
const CHAR_SYSTEM_RX = "08590f7e-db05-467e-8757-72f6faeb13f5";
const CHAR_SYSTEM_TX = "08590f7e-db05-467e-8757-72f6faeb1306";
const SCAN_TIMEOUT_MS = 15000;

const MODE_BYTES: Record<string, number[]> = {
  autonomous: [201, 54, 184, 71, 88, 193, 5, 10, 0, 0, 0, 0, 146, 124],
  driver: [201, 54, 184, 71, 88, 193, 5, 8, 0, 0, 0, 0, 214, 255],
  disabled: [201, 54, 184, 71, 88, 193, 5, 11, 0, 0, 0, 0, 56, 45],
};

const bytesToBase64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

const base64ToBytes = (b64: string): number[] =>
  Array.from(atob(b64)).map((c) => c.charCodeAt(0));

const UNPAIRED_SENTINEL = [0xde, 0xad, 0xfa, 0xce];

const isUnpaired = (bytes: number[]) =>
  bytes.length >= 4 && UNPAIRED_SENTINEL.every((b, i) => bytes[i] === b);

const CHAR_PAIRING = "08590f7e-db05-467e-8757-72f6faeb13e5";

const manager = new BleManager();

export type ConnectedDevice = {
  deviceId: string;
  deviceName: string;
};

export const useVexSerial = () => {
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [pairingDevice, setPairingDevice] = useState<ConnectedDevice | null>(null);

  const bleDevicesRef = useRef<Map<string, Device>>(new Map());
  const pendingPairRef = useRef<Device | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopScan = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    manager.stopDeviceScan();
    setConnecting(false);
  }, []);

  const connectController = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      const bleState = await manager.state();
      if (bleState !== State.PoweredOn) {
        console.warn("[VexSerial iOS] Bluetooth not powered on:", bleState);
        setConnecting(false);
        return;
      }
    } catch (e) {
      console.error("[VexSerial iOS] state check error:", e);
      setConnecting(false);
      return;
    }

    scanTimeoutRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setConnecting(false);
    }, SCAN_TIMEOUT_MS);

    manager.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (error || !device) {
        console.error("[VexSerial iOS] scan error:", error);
        stopScan();
        return;
      }

      if (bleDevicesRef.current.has(device.id)) {
        stopScan();
        return;
      }

      stopScan();

      try {
        const connected = await device.connect();
        await connected.discoverAllServicesAndCharacteristics();
        const name =
          connected.name ?? `VEX Brain ${connected.id.slice(-4).toUpperCase()}`;

        const pairingChar = await connected.readCharacteristicForService(
          SERVICE_UUID,
          CHAR_PAIRING,
        );
        const bytes = pairingChar.value
          ? base64ToBytes(pairingChar.value)
          : UNPAIRED_SENTINEL;

        if (isUnpaired(bytes)) {
          await connected.writeCharacteristicWithResponseForService(
            SERVICE_UUID,
            CHAR_PAIRING,
            bytesToBase64([0xff, 0xff, 0xff, 0xff]),
          );
          pendingPairRef.current = connected;
          setPairingDevice({ deviceId: connected.id, deviceName: name });
        } else {
          connected.monitorCharacteristicForService(
            SERVICE_UUID,
            CHAR_SYSTEM_TX,
            () => {},
          );
          bleDevicesRef.current.set(connected.id, connected);
          setConnectedDevices((prev) => {
            if (prev.some((d) => d.deviceId === connected.id)) return prev;
            return [...prev, { deviceId: connected.id, deviceName: name }];
          });
        }
      } catch (e) {
        console.error("[VexSerial iOS] connection error:", e);
      }
    });
  }, [connecting, stopScan]);

  const submitPin = useCallback(async (pin: string) => {
    const device = pendingPairRef.current;
    if (!device || pin.length !== 4) return;

    const pinBytes = Array.from(pin).map((c) => parseInt(c, 10));
    if (pinBytes.some(isNaN)) return;

    try {
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_PAIRING,
        bytesToBase64(pinBytes),
      );
      const check = await device.readCharacteristicForService(SERVICE_UUID, CHAR_PAIRING);
      const checkBytes = check.value ? base64ToBytes(check.value) : UNPAIRED_SENTINEL;
      if (!isUnpaired(checkBytes)) {
        pendingPairRef.current = null;
        setPairingDevice(null);
        device.monitorCharacteristicForService(SERVICE_UUID, CHAR_SYSTEM_TX, () => {});
        bleDevicesRef.current.set(device.id, device);
        setConnectedDevices((prev) => {
          if (prev.some((d) => d.deviceId === device.id)) return prev;
          const name = device.name ?? `VEX Brain ${device.id.slice(-4).toUpperCase()}`;
          return [...prev, { deviceId: device.id, deviceName: name }];
        });
      }
    } catch (e) {
      console.error("[VexSerial iOS] submitPin error:", e);
    }
  }, []);

  const disconnectAll = useCallback(() => {
    stopScan();
    bleDevicesRef.current.forEach((device) => {
      try {
        device.cancelConnection();
      } catch {}
    });
    bleDevicesRef.current.clear();
    pendingPairRef.current = null;
    setPairingDevice(null);
    setConnectedDevices([]);
  }, [stopScan]);

  const sendMatchMode = useCallback((mode: string) => {
    const bytes = MODE_BYTES[mode];
    if (!bytes) return;
    const b64 = bytesToBase64(bytes);
    bleDevicesRef.current.forEach(async (device) => {
      try {
        await device.writeCharacteristicWithoutResponseForService(
          SERVICE_UUID,
          CHAR_SYSTEM_RX,
          b64,
        );
      } catch (e) {
        console.error("[VexSerial iOS] sendMatchMode error:", e);
      }
    });
  }, []);

  return {
    connectedDevices,
    connecting,
    connectController,
    disconnectAll,
    sendMatchMode,
    pairingDevice,
    submitPin,
  };
};
