import { useState, useCallback, useRef } from "react";
import {
  initSerialport,
  useSerialport,
  Mode,
  Device,
  DriverType,
  ReturnedDataType,
} from "@serserm/react-native-turbo-serialport";

const VEX_VENDOR_ID = 10376;
const BAUD_RATE = 115200;

const MODE_BYTES: Record<string, number[]> = {
  autonomous: [201, 54, 184, 71, 88, 193, 5, 10, 0, 0, 0, 0, 146, 124],
  driver: [201, 54, 184, 71, 88, 193, 5, 8, 0, 0, 0, 0, 214, 255],
  disabled: [201, 54, 184, 71, 88, 193, 5, 11, 0, 0, 0, 0, 56, 45],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

initSerialport({ autoConnect: false, mode: Mode.ASYNC });

export type ConnectedDevice = {
  deviceId: number;
  deviceName: string;
};

export const useVexSerial = () => {
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const devicesRef = useRef<Map<number, Device>>(new Map());
  const deviceInterfaceCountRef = useRef<Map<number, number>>(new Map());
  const connectedInterfaceRef = useRef<Map<number, number>>(new Map());

  const writeModeToDevice = useCallback(
    (device: Device, deviceId: number, modeBytes: number[]) => {
      const count = deviceInterfaceCountRef.current.get(deviceId) ?? 1;
      const connectedInterface = connectedInterfaceRef.current.get(deviceId);
      const allInterfaces = Array.from({ length: Math.max(1, count) }, (_, i) => i);
      const interfaces =
        typeof connectedInterface === "number"
          ? [connectedInterface, ...allInterfaces.filter((i) => i !== connectedInterface)]
          : allInterfaces;

      for (const portInterface of interfaces) {
        try {
          device.writeBytes(modeBytes, portInterface);
        } catch (e) {
          console.error(
            "[VexSerial] writeBytes error device:",
            deviceId,
            "iface:",
            portInterface,
            e,
          );
        }
      }
    },
    [],
  );

  const serialport = useSerialport({
    onReadData: ({ deviceId, portInterface, data }) => {},
    onConnected: ({ deviceId, portInterface }) => {
      if (typeof portInterface === "number") {
        connectedInterfaceRef.current.set(deviceId, portInterface);
      }
      setConnectedDevices((prev) => {
        if (prev.some((d) => d.deviceId === deviceId)) return prev;
        return [...prev, { deviceId, deviceName: `VEX #${deviceId}` }];
      });
      const device = devicesRef.current.get(deviceId);
      if (device) {
        writeModeToDevice(device, deviceId, MODE_BYTES.disabled);
      }
    },
    onDisconnected: ({ deviceId }) => {
      devicesRef.current.delete(deviceId);
      deviceInterfaceCountRef.current.delete(deviceId);
      connectedInterfaceRef.current.delete(deviceId);
      setConnectedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    },
    onDeviceAttached: ({ deviceId }) => {},
    onDeviceDetached: ({ deviceId }) => {
      devicesRef.current.delete(deviceId);
      deviceInterfaceCountRef.current.delete(deviceId);
      connectedInterfaceRef.current.delete(deviceId);
      setConnectedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    },
    onError: ({ errorCode, errorMessage }) => {
      if (errorCode === 4 && errorMessage?.includes("Connection Failed")) {
        console.log("[VexSerial] connect ignored: device already connected");
        return;
      }
      console.error("[VexSerial] error:", errorCode, errorMessage);
    },
  });

  const connectController = useCallback(async () => {
    setConnecting(true);
    try {
      const devices = await serialport.listDevices();
      const vexDevices = (devices as any[]).filter((d) => d.vendorId === VEX_VENDOR_ID);
      for (const device of vexDevices) {
        const alreadyListed = connectedDevices.some(
          (d) => d.deviceId === device.deviceId,
        );
        if (alreadyListed) {
          continue;
        }
        try {
          const isConnected = await device.isConnected();
          if (isConnected) {
            setConnectedDevices((prev) => {
              if (prev.some((d) => d.deviceId === device.deviceId)) return prev;
              return [
                ...prev,
                { deviceId: device.deviceId, deviceName: `VEX #${device.deviceId}` },
              ];
            });
            devicesRef.current.set(device.deviceId, device);
            continue;
          }
        } catch {}

        const interfaceCount =
          typeof device.interfaceCount === "number" ? device.interfaceCount : 1;
        const interfaceCandidates = interfaceCount > 1 ? [-1, 0, 1, 2] : [-1, 0];
        const connectProfiles = [
          { driver: DriverType.AUTO, name: "AUTO" },
          { driver: DriverType.CDC, name: "CDC" },
        ];
        devicesRef.current.set(device.deviceId, device);
        deviceInterfaceCountRef.current.set(device.deviceId, interfaceCount);

        let connected = false;
        for (const profile of connectProfiles) {
          if (connected) break;
          for (const iface of interfaceCandidates) {
            if (connected) break;
            try {
              device.setParams({
                baudRate: BAUD_RATE,
                driver: profile.driver,
                portInterface: iface,
                returnedDataType: ReturnedDataType.INTARRAY,
              });
              device.connect();
              await sleep(250);
              const isConnected = await device.isConnected();
              if (isConnected) {
                connected = true;
                break;
              }
              try {
                device.disconnect();
              } catch {}
            } catch (e) {}
          }
        }

        if (!connected) {
          console.error("[VexSerial] Failed to connect device:", device.deviceId);
        }
      }
    } catch (e) {
      console.error("[VexSerial] connectController error:", e);
    }
    setConnecting(false);
  }, [serialport, connectedDevices]);

  const disconnectAll = useCallback(() => {
    try {
      serialport.disconnect();
    } catch {}
    devicesRef.current.clear();
    deviceInterfaceCountRef.current.clear();
    connectedInterfaceRef.current.clear();
    setConnectedDevices([]);
  }, [serialport]);

  const sendMatchMode = useCallback(
    (mode: string) => {
      const bytes = MODE_BYTES[mode];
      if (!bytes) return;
      devicesRef.current.forEach((device, deviceId) => {
        writeModeToDevice(device, deviceId, bytes);
      });
    },
    [writeModeToDevice],
  );

  return {
    connectedDevices,
    connecting,
    connectController,
    disconnectAll,
    sendMatchMode,
  };
};
