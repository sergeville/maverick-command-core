import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Car,
  Bluetooth,
  Gauge,
  Activity,
  Fuel,
  Thermometer,
  BatteryCharging,
  AlertTriangle,
  Cpu,
  Zap,
  Radar,
  TimerReset,
  Smartphone,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BleClient, numbersToDataView, dataViewToText } from "@capacitor-community/bluetooth-le";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * iPhone-ready Capacitor OBD-II dashboard.
 *
 * What changed from the browser prototype:
 * - Uses Capacitor BLE instead of Web Bluetooth
 * - Works for native iPhone builds when paired with a BLE OBD-II dongle
 * - Keeps mock mode for UI testing without hardware
 * - Includes adapter profile mapping for common BLE serial layouts
 *
 * Required packages:
 * npm i @capacitor/core @capacitor/app @capacitor-community/bluetooth-le
 * npx cap add ios
 *
 * iOS Info.plist keys you will need:
 * - NSBluetoothAlwaysUsageDescription
 * - NSBluetoothPeripheralUsageDescription
 *
 * Important:
 * This requires a BLE dongle, not Bluetooth Classic only.
 */

type Telemetry = {
  rpm: number;
  speed: number;
  coolant: number;
  throttle: number;
  load: number;
  fuelRate: number;
  voltage: number;
};

type Point = {
  t: string;
  rpm: number;
  speed: number;
  load: number;
};

type AdapterProfile = {
  name: string;
  service: string;
  write: string;
  notify: string;
};

const PIDS = {
  RPM: "010C",
  SPEED: "010D",
  ENGINE_LOAD: "0104",
  COOLANT_TEMP: "0105",
  THROTTLE: "0111",
  CONTROL_MODULE_VOLTAGE: "0142",
};

const ADAPTER_PROFILES: AdapterProfile[] = [
  {
    name: "V-LINK / FFFx",
    service: "0000fff0-0000-1000-8000-00805f9b34fb",
    write: "0000fff2-0000-1000-8000-00805f9b34fb",
    notify: "0000fff1-0000-1000-8000-00805f9b34fb",
  },
  {
    name: "Nordic UART",
    service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    write: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    notify: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  },
];

const initialTelemetry: Telemetry = {
  rpm: 812,
  speed: 0,
  coolant: 72,
  throttle: 8,
  load: 13,
  fuelRate: 1.1,
  voltage: 12.4,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isNativeMobile() {
  return Capacitor.isNativePlatform();
}

function textToNumbers(value: string) {
  return Array.from(new TextEncoder().encode(value));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function StatCard({
  title,
  value,
  unit,
  icon,
  glow,
}: {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  glow?: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
      <div className={`absolute inset-x-0 top-0 h-px ${glow ?? "bg-cyan-400/40"}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/85">{title}</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl md:text-4xl font-semibold text-white">{value}</span>
              <span className="text-sm text-white/85 mb-1">{unit}</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-cyan-300">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaverickObdFuturisticDashboard() {
  const [telemetry, setTelemetry] = useState<Telemetry>(initialTelemetry);
  const [history, setHistory] = useState<Point[]>([]);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [status, setStatus] = useState("Ready for iPhone BLE");
  const [deviceName, setDeviceName] = useState("No adapter connected");
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("web preview");
  const [activeProfile, setActiveProfile] = useState<string>("Not linked");

  const deviceIdRef = useRef<string | null>(null);
  const profileRef = useRef<AdapterProfile | null>(null);
  const pollRef = useRef<number | null>(null);
  const responseBufferRef = useRef("");

  useEffect(() => {
    setPlatform(isNativeMobile() ? Capacitor.getPlatform() : "web preview");
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (mode !== "mock") return;
      setTelemetry((prev) => {
        const nextSpeed = clamp(prev.speed + (Math.random() * 12 - 6), 0, 128);
        const nextRpm = clamp(850 + nextSpeed * 42 + (Math.random() * 320 - 160), 700, 5200);
        const nextLoad = clamp(8 + nextSpeed * 0.48 + (Math.random() * 8 - 4), 0, 100);
        const nextThrottle = clamp(6 + nextSpeed * 0.34 + (Math.random() * 10 - 5), 0, 100);
        const nextCoolant = clamp(prev.coolant + (Math.random() * 1.2 - 0.4), 68, 98);
        const nextFuelRate = clamp(0.8 + nextSpeed * 0.05 + Math.random() * 1.2, 0.6, 13.5);
        const nextVoltage = clamp(13.7 + (Math.random() * 0.5 - 0.25), 12.1, 14.5);

        return {
          rpm: Math.round(nextRpm),
          speed: Math.round(nextSpeed),
          load: Math.round(nextLoad),
          throttle: Math.round(nextThrottle),
          coolant: Number(nextCoolant.toFixed(1)),
          fuelRate: Number(nextFuelRate.toFixed(1)),
          voltage: Number(nextVoltage.toFixed(1)),
        };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [mode]);

  useEffect(() => {
    const stamp = new Date();
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          t: `${stamp.getMinutes().toString().padStart(2, "0")}:${stamp
            .getSeconds()
            .toString()
            .padStart(2, "0")}`,
          rpm: telemetry.rpm,
          speed: telemetry.speed,
          load: telemetry.load,
        },
      ];
      return next.slice(-24);
    });
  }, [telemetry]);

  useEffect(() => {
    let appListener: { remove: () => Promise<void> } | null = null;

    async function setup() {
      if (!isNativeMobile()) return;

      try {
        await BleClient.initialize();
        setStatus("BLE initialized");
      } catch (err) {
        setError(err instanceof Error ? err.message : "BLE initialization failed.");
      }

      appListener = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (isActive && connected && mode === "live") {
          startPolling();
        }
      });
    }

    setup();

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (appListener) void appListener.remove();
    };
  }, [connected, mode]);

  const efficiency = useMemo(() => {
    if (telemetry.speed < 5) return "—";
    return ((telemetry.fuelRate / Math.max(telemetry.speed, 1)) * 100).toFixed(1);
  }, [telemetry]);

  async function connectBluetooth() {
    setError(null);

    if (!isNativeMobile()) {
      setStatus("Web preview only. Build in Capacitor on iPhone for native BLE.");
      setMode("mock");
      return;
    }

    try {
      setStatus("Scanning for OBD-II BLE adapter...");
      const device = await BleClient.requestDevice({
        services: ADAPTER_PROFILES.map((profile) => profile.service),
        optionalServices: ADAPTER_PROFILES.map((profile) => profile.service),
      });

      deviceIdRef.current = device.deviceId;
      setDeviceName(device.name || "Unnamed OBD Adapter");
      setStatus("Connecting to adapter...");

      await BleClient.connect(device.deviceId, (deviceId) => {
        if (deviceId === device.deviceId) {
          setConnected(false);
          setMode("mock");
          setStatus("Adapter disconnected");
          setActiveProfile("Disconnected");
        }
      });

      const matchedProfile = await resolveAdapterProfile(device.deviceId);
      if (!matchedProfile) {
        throw new Error("Connected, but no compatible BLE serial service was found.");
      }

      profileRef.current = matchedProfile;
      setActiveProfile(matchedProfile.name);
      setConnected(true);
      setMode("live");
      setStatus("Adapter connected. Initializing ELM327...");

      await startNotifications(device.deviceId, matchedProfile);
      await initializeElm327();
      startPolling();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bluetooth connection failed.";
      setError(message);
      setStatus("Connection failed");
      setConnected(false);
      setMode("mock");
      setActiveProfile("Not linked");
    }
  }

  async function resolveAdapterProfile(deviceId: string) {
    for (const profile of ADAPTER_PROFILES) {
      try {
        const services = await BleClient.getServices(deviceId);
        const hasService = services.some((service) => service.uuid.toLowerCase() === profile.service.toLowerCase());
        if (hasService) {
          return profile;
        }
      } catch {
        // ignore and continue
      }
    }

    return null;
  }

  async function startNotifications(deviceId: string, profile: AdapterProfile) {
    await BleClient.startNotifications(deviceId, profile.service, profile.notify, (value) => {
      const chunk = dataViewToText(value);
      responseBufferRef.current += chunk;

      const frames = responseBufferRef.current.split("\\r");
      responseBufferRef.current = frames.pop() || "";
      for (const frame of frames) {
        parseElmResponse(frame);
      }
    });
  }

  async function disconnectBluetooth() {
    try {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (deviceIdRef.current && profileRef.current) {
        try {
          await BleClient.stopNotifications(
            deviceIdRef.current,
            profileRef.current.service,
            profileRef.current.notify,
          );
        } catch {
          // ignore
        }
      }

      if (deviceIdRef.current) {
        await BleClient.disconnect(deviceIdRef.current);
      }
    } finally {
      deviceIdRef.current = null;
      profileRef.current = null;
      responseBufferRef.current = "";
      setConnected(false);
      setMode("mock");
      setStatus("Disconnected");
      setDeviceName("No adapter connected");
      setActiveProfile("Not linked");
    }
  }

  async function writeCommand(command: string) {
    if (!deviceIdRef.current || !profileRef.current) {
      throw new Error("Adapter write channel not available.");
    }

    const payload = numbersToDataView(textToNumbers(`${command}\\r`));
    await BleClient.write(deviceIdRef.current, profileRef.current.service, profileRef.current.write, payload);
  }

  async function initializeElm327() {
    const initCommands = ["ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"];
    for (const cmd of initCommands) {
      await writeCommand(cmd);
      await delay(180);
    }
  }

  function startPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);

    const cycle = [
      PIDS.RPM,
      PIDS.SPEED,
      PIDS.ENGINE_LOAD,
      PIDS.COOLANT_TEMP,
      PIDS.THROTTLE,
      PIDS.CONTROL_MODULE_VOLTAGE,
    ];
    let idx = 0;

    pollRef.current = window.setInterval(async () => {
      try {
        await writeCommand(cycle[idx]);
        idx = (idx + 1) % cycle.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Polling error");
      }
    }, 350);
  }

  function parseElmResponse(raw: string) {
    const cleaned = raw.replace(/\\s|>/g, "").toUpperCase();
    if (!cleaned.includes("41")) return;

    try {
      if (cleaned.startsWith("410C") && cleaned.length >= 8) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        const b = parseInt(cleaned.slice(6, 8), 16);
        const rpm = Math.round(((a * 256) + b) / 4);
        setTelemetry((p) => ({ ...p, rpm }));
      }
      if (cleaned.startsWith("410D") && cleaned.length >= 6) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        setTelemetry((p) => ({ ...p, speed: a }));
      }
      if (cleaned.startsWith("4104") && cleaned.length >= 6) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        setTelemetry((p) => ({ ...p, load: Math.round((a * 100) / 255) }));
      }
      if (cleaned.startsWith("4105") && cleaned.length >= 6) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        setTelemetry((p) => ({ ...p, coolant: a - 40 }));
      }
      if (cleaned.startsWith("4111") && cleaned.length >= 6) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        setTelemetry((p) => ({ ...p, throttle: Math.round((a * 100) / 255) }));
      }
      if (cleaned.startsWith("4142") && cleaned.length >= 8) {
        const a = parseInt(cleaned.slice(4, 6), 16);
        const b = parseInt(cleaned.slice(6, 8), 16);
        const voltage = Number((((256 * a) + b) / 1000).toFixed(1));
        setTelemetry((p) => ({ ...p, voltage }));
      }
    } catch {
      // ignore malformed fragments
    }
  }

  return <div>See conversation canvas for full UI JSX. This handoff preserves the latest code state.</div>;
}
