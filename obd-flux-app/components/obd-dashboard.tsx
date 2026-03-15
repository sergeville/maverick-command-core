'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bluetooth, Gauge, Activity, Thermometer, BatteryCharging,
  Zap, Radar, Car, Cpu, AlertTriangle, WifiOff,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Telemetry, HistoryPoint, ConnectionStatus } from '@/types/obd';
import { ObdBleClient } from '@/lib/ble/obdBleClient';

const INITIAL: Telemetry = {
  rpm: 812, speed: 0, coolant: 72, throttle: 8,
  load: 13, fuelRate: 1.1, voltage: 12.4,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function MetricCard({
  label, value, unit, icon, accent = 'cyan',
}: {
  label: string; value: string | number; unit: string;
  icon: React.ReactNode; accent?: string;
}) {
  const accentMap: Record<string, string> = {
    cyan:   'border-t-cyan-400/60 text-cyan-300',
    amber:  'border-t-amber-400/60 text-amber-300',
    green:  'border-t-emerald-400/60 text-emerald-300',
    red:    'border-t-red-400/60 text-red-300',
    violet: 'border-t-violet-400/60 text-violet-300',
    blue:   'border-t-blue-400/60 text-blue-300',
  };
  const cls = accentMap[accent] ?? accentMap.cyan;
  return (
    <div className={`relative bg-white/4 border border-white/8 border-t-2 ${cls.split(' ')[0]} rounded-2xl p-5 backdrop-blur-md overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent pointer-events-none" />
      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">{label}</p>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
            <span className="text-sm text-white/40 mb-0.5">{unit}</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/8 ${cls.split(' ')[1]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, deviceName }: { status: ConnectionStatus; deviceName: string }) {
  const cfg = {
    idle:       { color: 'text-white/40 border-white/10 bg-white/5', dot: 'bg-white/30',  label: 'Offline' },
    scanning:   { color: 'text-blue-400 border-blue-400/30 bg-blue-400/10', dot: 'bg-blue-400 animate-pulse', label: 'Scanning…' },
    connecting: { color: 'text-amber-400 border-amber-400/30 bg-amber-400/10', dot: 'bg-amber-400 animate-pulse', label: 'Connecting…' },
    connected:  { color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', dot: 'bg-emerald-400', label: deviceName },
    error:      { color: 'text-red-400 border-red-400/30 bg-red-400/10', dot: 'bg-red-400', label: 'Error' },
  }[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}

export default function OBDFluxConsole() {
  const [telem, setTelem]         = useState<Telemetry>(INITIAL);
  const [history, setHistory]     = useState<HistoryPoint[]>([]);
  const [mode, setMode]           = useState<'mock' | 'live'>('mock');
  const [status, setStatus]       = useState<ConnectionStatus>('idle');
  const [deviceName, setDeviceName] = useState('No adapter');
  const [logs, setLogs]           = useState<string[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const clientRef                 = useRef<ObdBleClient | null>(null);
  const mockTimerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 20));

  // Mock mode simulation
  useEffect(() => {
    if (mode !== 'mock') return;
    mockTimerRef.current = setInterval(() => {
      setTelem(prev => {
        const nextSpeed   = clamp(prev.speed + (Math.random() * 10 - 5), 0, 128);
        const nextRpm     = clamp(850 + nextSpeed * 42 + (Math.random() * 300 - 150), 700, 5200);
        const nextLoad    = clamp(8 + nextSpeed * 0.48 + (Math.random() * 8 - 4), 0, 100);
        const nextThrottle = clamp(6 + nextSpeed * 0.34 + (Math.random() * 8 - 4), 0, 100);
        return {
          rpm:      Math.round(nextRpm),
          speed:    Math.round(nextSpeed),
          load:     Math.round(nextLoad),
          throttle: Math.round(nextThrottle),
          coolant:  clamp(prev.coolant + (Math.random() * 0.6 - 0.2), 68, 98),
          fuelRate: clamp(0.8 + nextSpeed * 0.05 + Math.random() * 1.0, 0.6, 13.5),
          voltage:  clamp(13.7 + (Math.random() * 0.4 - 0.2), 12.1, 14.5),
        };
      });
    }, 800);
    return () => { if (mockTimerRef.current) clearInterval(mockTimerRef.current); };
  }, [mode]);

  // Build history
  useEffect(() => {
    const now = new Date();
    const stamp = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setHistory(prev => [...prev, { t: stamp, rpm: telem.rpm, speed: telem.speed, load: telem.load }].slice(-30));
  }, [telem]);

  const efficiency = useMemo(() => {
    if (telem.speed < 5) return '—';
    return ((telem.fuelRate / Math.max(telem.speed, 1)) * 100).toFixed(1);
  }, [telem]);

  async function connectBluetooth() {
    if (!('bluetooth' in navigator)) {
      setError('Web Bluetooth not supported. Use Chrome on desktop or build with Capacitor for iPhone.');
      return;
    }
    setError(null);
    setStatus('scanning');
    addLog('Requesting BLE device…');

    try {
      clientRef.current = new ObdBleClient(
        (patch) => setTelem(p => ({ ...p, ...patch })),
        addLog,
      );
      const result = await clientRef.current.connect();
      setDeviceName(result.deviceName);
      setStatus('connected');
      setMode('live');
      addLog(`Connected: ${result.deviceName} via ${result.profileName}`);
      if (mockTimerRef.current) clearInterval(mockTimerRef.current);
    } catch (e: any) {
      setStatus('error');
      setError(e.message);
      addLog(`ERR: ${e.message}`);
      setMode('mock');
    }
  }

  async function disconnect() {
    await clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
    setMode('mock');
    setDeviceName('No adapter');
    addLog('Disconnected');
  }

  return (
    <div className="min-h-screen bg-[#020b18] text-white font-sans antialiased p-4 md:p-8 pb-32">

      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20">
              <Radar className="w-5 h-5 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              OBD <span className="text-cyan-400">Flux</span> Console
            </h1>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 border border-white/10 px-2 py-0.5 rounded">
              {mode === 'mock' ? 'MOCK' : 'LIVE'}
            </span>
          </div>
          <p className="text-xs text-white/30 ml-14">Ford Maverick · BLE OBD-II Telemetry</p>
        </div>
        <StatusBadge status={status} deviceName={deviceName} />
      </header>

      <main className="max-w-6xl mx-auto space-y-8">

        {/* Drive Core — speed hero */}
        <div className="relative bg-gradient-to-br from-cyan-950/40 to-[#020b18] border border-cyan-400/15 rounded-3xl p-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.08),transparent_60%)]" />
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/50 font-bold mb-2">Drive Core</span>
              <motion.span
                key={telem.speed}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-[96px] leading-none font-black tabular-nums text-white drop-shadow-[0_0_40px_rgba(6,182,212,0.3)]"
              >
                {telem.speed}
              </motion.span>
              <span className="text-sm font-semibold text-white/30 tracking-widest mt-1">KM/H</span>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">RPM</p>
                <p className={`text-2xl font-black tabular-nums ${telem.rpm > 4500 ? 'text-red-400' : 'text-white'}`}>{telem.rpm.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Load</p>
                <p className="text-2xl font-black tabular-nums text-cyan-300">{telem.load}%</p>
              </div>
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Throttle</p>
                <p className="text-2xl font-black tabular-nums text-amber-300">{telem.throttle}%</p>
              </div>
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Coolant</p>
                <p className="text-2xl font-black tabular-nums text-emerald-300">{telem.coolant.toFixed(1)}°C</p>
              </div>
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Voltage</p>
                <p className="text-2xl font-black tabular-nums text-violet-300">{telem.voltage}V</p>
              </div>
              <div className="p-4 bg-white/4 border border-white/8 rounded-2xl text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">L/100km</p>
                <p className="text-2xl font-black tabular-nums text-orange-300">{efficiency}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Chart */}
        <div className="bg-white/3 border border-white/8 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Live Telemetry</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="rpm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="speed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="load" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="t" stroke="#ffffff15" fontSize={8} tick={{ fill: '#ffffff40' }} />
              <YAxis stroke="#ffffff15" fontSize={8} tick={{ fill: '#ffffff40' }} />
              <Tooltip
                contentStyle={{ background: '#020b18', border: '1px solid #22d3ee33', borderRadius: 12, fontSize: 11 }}
                labelStyle={{ color: '#ffffff60' }}
              />
              <Area type="monotone" dataKey="rpm" stroke="#22d3ee" strokeWidth={2} fill="url(#rpm)" dot={false} />
              <Area type="monotone" dataKey="speed" stroke="#34d399" strokeWidth={2} fill="url(#speed)" dot={false} />
              <Area type="monotone" dataKey="load" stroke="#f59e0b" strokeWidth={2} fill="url(#load)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-4 justify-center">
            {[['RPM', '#22d3ee'], ['Speed', '#34d399'], ['Load %', '#f59e0b']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: color }} />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="RPM"      value={telem.rpm.toLocaleString()} unit="rev/min" icon={<Gauge className="w-5 h-5" />}          accent="cyan" />
          <MetricCard label="Speed"    value={telem.speed}                unit="km/h"    icon={<Radar className="w-5 h-5" />}          accent="blue" />
          <MetricCard label="Load"     value={telem.load}                 unit="%"       icon={<Cpu className="w-5 h-5" />}            accent="amber" />
          <MetricCard label="Throttle" value={telem.throttle}             unit="%"       icon={<Zap className="w-5 h-5" />}            accent="amber" />
          <MetricCard label="Coolant"  value={telem.coolant.toFixed(1)}   unit="°C"      icon={<Thermometer className="w-5 h-5" />}    accent="green" />
          <MetricCard label="Voltage"  value={telem.voltage}              unit="V"       icon={<BatteryCharging className="w-5 h-5" />} accent="violet" />
        </div>

        {/* Connection Blueprint + Log */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/3 border border-cyan-400/15 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bluetooth className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Connection Blueprint</h2>
            </div>
            <ul className="space-y-3 text-xs text-white/40 mb-6">
              <li className="flex gap-2"><span className="text-cyan-400">01</span> BLE OBD-II dongle required (V-LINK / ELM327 BLE)</li>
              <li className="flex gap-2"><span className="text-cyan-400">02</span> Close any other OBD app (Torque, OBD Fusion)</li>
              <li className="flex gap-2"><span className="text-cyan-400">03</span> Chrome Desktop — Web Bluetooth; iOS — build with Capacitor</li>
              <li className="flex gap-2"><span className="text-cyan-400">04</span> FFFx / Nordic UART / ISSC profiles auto-detected</li>
            </ul>
            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {status === 'connected' ? (
              <button
                onClick={disconnect}
                className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4" /> Disconnect
              </button>
            ) : (
              <button
                onClick={connectBluetooth}
                disabled={status === 'scanning' || status === 'connecting'}
                className="w-full py-3 bg-cyan-400/10 border border-cyan-400/30 rounded-xl text-sm font-black uppercase tracking-wider text-cyan-400 hover:bg-cyan-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Bluetooth className="w-4 h-4" />
                {status === 'scanning' ? 'Scanning…' : status === 'connecting' ? 'Connecting…' : 'Connect OBD-II'}
              </button>
            )}
          </div>

          {/* System Log */}
          <div className="bg-black/40 border border-white/6 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">System Bus</span>
              <Car className="w-3.5 h-3.5 text-white/20" />
            </div>
            <div className="flex-1 p-4 font-mono text-[10px] text-cyan-400/50 space-y-1 overflow-y-auto max-h-48">
              {logs.length === 0 ? (
                <p className="text-white/15 italic">Awaiting telemetry…</p>
              ) : (
                logs.map((l, i) => <div key={i} className="truncate">{l}</div>)
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer mode toggle */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
          <span className="text-white/30">Mode:</span>
          <button
            onClick={() => setMode('mock')}
            className={`px-4 py-1.5 rounded-lg transition-all ${mode === 'mock' ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white/70'}`}
          >
            Mock
          </button>
          <button
            onClick={connectBluetooth}
            className={`px-4 py-1.5 rounded-lg transition-all ${mode === 'live' ? 'bg-cyan-400 text-black' : 'text-white/40 hover:text-white/70'}`}
          >
            Live BLE
          </button>
        </div>
      </footer>
    </div>
  );
}
