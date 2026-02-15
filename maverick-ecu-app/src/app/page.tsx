"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import maverickIcon from '@/assets/ford-maverick-icon.png';
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  History,
  AlertTriangle,
  ChevronRight,
  Database,
  Info,
  CheckCircle2,
  List,
  Bluetooth,
  Terminal,
  Gauge as GaugeIcon,
  LineChart as ChartIcon,
  Send,
  Stethoscope,
  Download,
  Maximize2,
  Minimize2,
  Trash2,
  Zap,
  Play,
  Timer,
  Fuel,
  Radio,
  Unplug,
  FileText,
  Activity as Heartbeat,
  FolderTree,
  ZapOff,
  Lock,
  RefreshCw,
  Wrench,
  Droplets,
  Zap as SparkPlug
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { parseRawECUData, ECUData } from '@/lib/ecu-parser';
import { BluetoothService } from '@/lib/bluetooth-service';

const INITIAL_DATA = `OBD-II
ECU protocol: 6) ISO 15765-4 CAN (11 bit ID, 500 kbaud)
ECU address/CAN Id: 7E8
VIN: 3FTTW8J38SRA80038
Off-cycle Credit Technology #3 Vehicle Data: 
Active Off-Cycle Credit Technology #3 Timer 1 (Recent) [seconds]: 16777384
Active Off-Cycle Credit Technology #3 Timer 2 (Recent) [seconds]: -1325400012
Active Off-Cycle Credit Technology #3 Timer 1 (Lifetime) [seconds]: -1711273805
Active Off-Cycle Credit Technology #3 Timer 2 (Lifetime) [seconds]: 2097152274

Run Time for Stop-Start and Coasting Off-cycle Credit Vehicle Data: 
Idle Stop-Start Timer (Recent) [seconds]: 16777249
Idle Stop-Start Timer (Lifetime) [seconds]: -218103410
Engine Running Coasting Timer (Recent) [seconds]: -2063597569
Engine Running Coasting Timer (Lifetime) [seconds]: -1
Engine Off Coasting Timer (Recent) [seconds]: -1
Engine Off Coasting Timer (Lifetime) [seconds]: -1

Vehicle Operation Data - Engine Run/Idle Time: 
Ignition Counter (Recent): 16777216
Ignition Counter (Lifetime): 973078530
Fueled Engine Operation Ignition Cycle Counter (Recent) [seconds]: 637534208
Fueled Engine Operation Ignition Cycle Counter (Lifetime) [seconds]: 922746881
Total Engine Run Time (Recent) [seconds]: -838860646
Total Engine Run Time (Lifetime) [seconds]: 33555694
Total Idle Engine Run Time (Recent) [seconds]: 1996488746
Total Idle Engine Run Time (Lifetime) [seconds]: -771751742

Distance Traveled Since Evap Monitoring Decision: 260 km/h
Certification Test Group/Engine Family Number : SFMXT02.54F1
Fueled Engine Operation Ignition Cycle Counter: 257
ECU name: ECM31560962501
VIN: 3FTTW8J38SRA80038
Manufacturer ECU hardware number: SZ6A-14F107-EA
Programming date (HEX): 535A36412D3134463130372D454100000000000000000000

ABS/ESP
Assembly ver.: SZ1C-2C219-CH
ECU Software Number.: SZ1C-2D053-CH
Boot software identification: SK9C-14C461-AA
ECU serial number: 000PT62521503D0A
VIN: 3FTTW8J38SRA80038

BCM
Assembly ver.: RU5T-14B476-BCD
ECU Software Number.: RU5T-14C184-ACD
ECU serial number: 4714004089823001
VIN: 3FTTW8J38SRA80038

BECM
Assembly ver.: NZ68-10B687-CA
ECU Software Number.: NZ68-14C197-CA
ECU serial number: H388E25077022099

GWM
Assembly ver.: PU5T-14H474-CFF
ECU Software Number.: SZ6T-14H483-FFH
ECU serial number: ANHGG25101054560
VIN: 3FTTW8J38SRA80038

IPMA
Assembly ver.: SZ6T-14G647-BBB
ECU Software Number.: SJ8T-14H102-ABG
ECU serial number: ECUR2509301738
VIN: 3FTTW8J38SRA80038

SOBDMC
Assembly ver.: PZ18-7P120-MA
ECU Software Number.: SZ6A-14G069-DE
Boot software identification: PZ18-14G072-AC
ECU serial number: V4B1B25090210268
VIN: 3FTTW8J38SRA80038`;

const ECU_DEFINITIONS: Record<string, string> = {
  'ABS/ESP': 'Anti-lock Braking / Electronic Stability Program.',
  'BCM': 'Body Control Module. Manages lighting, security, and locks.',
  'BECM': 'Battery Energy Control Module. Hybrid battery management.',
  'GWM': 'Gateway Module. The central hub for all vehicle data networks.',
  'IPMA': 'Image Processing Module. Controls cameras and safety systems.',
  'SOBDMC': 'Secondary OBD Control. High-voltage powertrain management.'
};

const Gauge = ({ value, label, unit, max, color, hud }: any) => {
  const percentage = Math.min((parseFloat(value) || 0) / max * 100, 100);
  if (hud) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/40 rounded-3xl border border-amber-500/10">
        <span className={`text-[120px] font-black font-mono leading-none tracking-tighter transition-colors ${label === 'RPM' && value > 5000 ? 'text-red-500 animate-pulse' : 'text-white'} drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]`}>
          {value}
        </span>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-2xl font-black uppercase tracking-[0.3em] text-amber-500">{label}</span>
          <span className="text-xl font-mono text-white/40">{unit}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center group hover:border-amber-500/20 transition-all">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
          <circle cx="64" cy="64" r="58" stroke={color} strokeWidth="8" fill="transparent" 
            strokeDasharray={364} 
            strokeDashoffset={364 - (364 * percentage) / 100}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black font-mono tracking-tighter">{value}</span>
          <span className="text-[8px] uppercase font-bold opacity-40 tracking-widest">{unit}</span>
        </div>
      </div>
      <h4 className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60">{label}</h4>
    </div>
  );
};

export default function MaverickDashboard() {
  const [rawData, setRawData] = useState(INITIAL_DATA);
  const [data, setData] = useState<ECUData | null>(null);
  const [history, setHistory] = useState<ECUData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'gauges' | 'telemetry' | 'dtcs' | 'modules' | 'history' | 'service'>('overview');
  const [isLive, setIsLive] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isHudMode, setIsHudMode] = useState(false);
  const [heartbeat, setHeartbeat] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({ rpm: 0, speed: 0, temp: 60, volt: 14.2, load: 0, fuel: 8.4 });
  const [perfTimer, setPerfTimer] = useState({ startTime: 0, result: 0, isRunning: false });
  const [command, setCommand] = useState('');
  const bluetoothRef = useRef<BluetoothService | null>(null);
  const simInterval = useRef<any>(null);
  const stopPolling = useRef(false);

  useEffect(() => {
    const parsed = parseRawECUData(rawData);
    setData(parsed);
    const saved = localStorage.getItem('maverick_ecu_history');
    if (saved) try { setHistory(JSON.parse(saved)); } catch(e) {}
  }, [rawData]);

  // Sequential Polling Engine
  useEffect(() => {
    if (isConnected && isLive && !isSimulating) {
      stopPolling.current = false;
      const poll = async () => {
        if (stopPolling.current || !bluetoothRef.current) return;
        
        // Sequential Cycle: RPM -> Speed -> Wait -> Repeat
        await bluetoothRef.current.sendCommand('010C');
        await new Promise(r => setTimeout(r, 300));
        await bluetoothRef.current.sendCommand('010D');
        await new Promise(r => setTimeout(r, 300));
        
        poll();
      };
      poll();
    } else {
      stopPolling.current = true;
    }
    return () => { stopPolling.current = true; };
  }, [isConnected, isLive, isSimulating]);

  // Performance Timer Logic
  useEffect(() => {
    if (liveMetrics.speed > 0 && !perfTimer.isRunning && perfTimer.result === 0) {
      setPerfTimer({ startTime: Date.now(), result: 0, isRunning: true });
    }
    if (liveMetrics.speed >= 100 && perfTimer.isRunning) {
      const time = (Date.now() - perfTimer.startTime) / 1000;
      setPerfTimer(prev => ({ ...prev, result: time, isRunning: false }));
    }
    if (liveMetrics.speed === 0 && !perfTimer.isRunning && perfTimer.result > 0) {
      setPerfTimer({ startTime: 0, result: 0, isRunning: false });
    }
  }, [liveMetrics.speed, perfTimer.isRunning, perfTimer.result]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 15));

  const pulseHeartbeat = () => {
    setHeartbeat(true);
    setTimeout(() => setHeartbeat(false), 100);
  };

  const saveSnapshot = () => {
    if (!data) return;
    const newHistory = [data, ...history];
    setHistory(newHistory);
    localStorage.setItem('maverick_ecu_history', JSON.stringify(newHistory));
    addLog("Snapshot archived.");
  };

  const clearHistory = () => {
    if (confirm("Purge archives?")) {
      setHistory([]);
      localStorage.removeItem('maverick_ecu_history');
    }
  };

  const releasePairing = async () => {
    if (!bluetoothRef.current) return;
    addLog("LINK: Resetting all hardware pipes...");
    await bluetoothRef.current.release();
    setIsConnected(false);
    setIsConnecting(false);
    addLog("SYSTEM: Reset complete. Ready for new selection.");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maverick_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const generateHealthReport = () => {
    if (!data) return;
    const report = `HEALTH REPORT: ${data.vin}\nMODULES: ${data.modules.length}\nFAULTS: ${data.dtcs.length}\nSTATUS: ${data.dtcs.length > 0 ? 'FAIL' : 'OK'}`;
    alert(report);
  };

  const toggleSimMode = () => {
    if (isSimulating) {
      clearInterval(simInterval.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      setIsLive(true);
      simInterval.current = setInterval(() => {
        pulseHeartbeat();
        setLiveMetrics(prev => {
          const newSpeed = prev.speed + (prev.rpm > 3000 ? 5 : 1);
          return {
            rpm: Math.floor(800 + Math.random() * 5500),
            speed: newSpeed > 140 ? 0 : newSpeed,
            temp: Math.min(prev.temp + 0.05, 102),
            volt: 13.8 + Math.random() * 0.4,
            load: Math.floor(20 + Math.random() * 60),
            fuel: 7.2 + Math.random() * 2.5
          };
        });
      }, 500);
    }
  };

  const toggleConnection = async () => {
    if (isConnected) {
      bluetoothRef.current?.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }
    
    setIsConnecting(true);
    if (!bluetoothRef.current) {
      bluetoothRef.current = new BluetoothService((incoming) => {
        addLog(`<< ${incoming}`);
        pulseHeartbeat();
        if (incoming.includes('41 0C')) { 
          const hex = incoming.split(' ').slice(2, 4).join('');
          setLiveMetrics(prev => ({ ...prev, rpm: Math.floor(parseInt(hex, 16) / 4) }));
        }
        if (incoming.includes('41 0D')) { 
          const hex = incoming.split(' ')[2];
          setLiveMetrics(prev => ({ ...prev, speed: parseInt(hex, 16) }));
        }
        if (incoming.startsWith('43') || incoming.startsWith('47')) {
          const parsed = parseRawECUData(incoming);
          if (parsed.dtcs.length > 0) setData(prev => prev ? { ...prev, dtcs: parsed.dtcs } : parsed);
        }
        if (incoming.startsWith('44')) setData(prev => prev ? { ...prev, dtcs: [] } : null);
      });
    }
    
    try {
      const result = await bluetoothRef.current.connect();
      setIsConnected(result.success);
      if (result.success) {
        setIsLive(true);
        setActiveTab('gauges');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const sendManualCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !isConnected) return;
    await bluetoothRef.current?.sendCommand(command);
    setCommand('');
  };

  const requestDTCs = async () => {
    if (!isConnected) return;
    addLog(">> Mode 03 (DTC Scan)");
    await bluetoothRef.current?.sendCommand('03');
  };

  const clearDTCs = async () => {
    if (!isConnected) return;
    if (confirm("Proceed with DTC Wipe? This will reset your check engine light.")) {
      addLog(">> Mode 04 (DTC Reset)");
      await bluetoothRef.current?.sendCommand('04');
    }
  };

  if (!data) return null;

  const chartData = (data.telemetry || []).slice(-50).map(p => ({
    time: p.time ? p.time.split('.')[0] : '00:00:00',
    ...p.metrics
  }));

  const telemetryKeys = (data.telemetry && data.telemetry.length > 0) ? Object.keys(data.telemetry[0].metrics) : [];

  const ignitionCount = data.timers.find(t => t.label.includes('Ignition Counter (Lifetime)'))?.value || 0;
  const runTime = data.timers.find(t => t.label.includes('Total Engine Run Time (Lifetime)'))?.value || 0;

  return (
    <div className={`min-h-screen ${isHudMode ? 'bg-black overflow-hidden' : 'bg-[#050505] pb-32'} text-amber-50 font-sans p-4 md:p-8 transition-all duration-700`}>
      {!isHudMode && (
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image src={maverickIcon} alt="Maverick" width={64} height={64} className="rounded-xl bg-[#050505] border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]" />
              {(isConnected || isSimulating || isConnecting) && (
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-blue-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic text-amber-500 underline decoration-amber-500/20 underline-offset-8">Maverick Command Core</h1>
                <div className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${isConnected ? 'bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : isConnecting ? 'bg-blue-500/10 border-blue-500/40 text-blue-500' : isSimulating ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' : 'bg-red-500/10 border-red-500/40 text-red-500'}`}>
                  {isConnected ? <Radio className={`w-3 h-3 ${heartbeat ? 'scale-125' : ''} transition-transform`} /> : isConnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : isSimulating ? <Zap className="w-3 h-3" /> : <Unplug className="w-3 h-3" />}
                  {isConnected ? 'System Online' : isConnecting ? 'Initializing Link' : isSimulating ? 'Virtual Simulator' : 'System Offline'}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-amber-500/40 mt-3">
                <span>{data.vin || '3FTTW8J38SRAXXXXX'}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase text-[8px] font-black">{data.type}</span>
              </div>
            </div>
          </div>
          <nav className="flex gap-2 bg-amber-950/20 p-1.5 rounded-xl border border-amber-500/10 overflow-x-auto max-w-full">
            {(['overview', 'gauges', 'telemetry', 'dtcs', 'service', 'history'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-[0.2em] whitespace-nowrap ${activeTab === tab ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'text-amber-500/40 hover:text-amber-500/60'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </header>
      )}

      <main className={isHudMode ? "h-screen flex flex-col items-center justify-center relative" : "max-w-7xl mx-auto space-y-8"}>
        {isHudMode && (
          <button onClick={() => setIsHudMode(false)} className="absolute top-8 right-8 p-4 bg-amber-500/10 rounded-full text-amber-500 hover:bg-amber-500 hover:text-black transition-all">
            <Minimize2 className="w-8 h-8" />
          </button>
        )}

        {activeTab === 'overview' && !isHudMode && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Link Status', value: isConnected ? 'CONNECTED' : isConnecting ? 'CONNECTING' : isSimulating ? 'SIMULATING' : 'OFFLINE', icon: ShieldCheck },
                  { label: 'Data Heartbeat', value: heartbeat ? 'PACKET IN' : 'WAITING', icon: Heartbeat },
                  { label: 'Diagnostic Count', value: data.modules.length, icon: Cpu }
                ].map((stat, i) => (
                  <div key={i} className={`bg-zinc-900/20 border border-amber-500/10 p-6 rounded-2xl relative overflow-hidden transition-colors ${i === 1 && heartbeat ? 'bg-amber-500/5 border-amber-500/40' : ''}`}>
                    <stat.icon className={`w-12 h-12 text-amber-500 opacity-5 absolute -right-2 -bottom-2 ${i === 1 && heartbeat ? 'opacity-20 scale-110' : ''} transition-all`} />
                    <h3 className="text-amber-500/50 uppercase text-[10px] font-bold tracking-widest mb-1">{stat.label}</h3>
                    <p className={`text-xl font-mono font-bold ${stat.value === 'CONNECTED' ? 'text-green-500' : stat.value === 'CONNECTING' ? 'text-blue-500' : ''}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-900/30 border border-amber-500/10 p-8 rounded-3xl h-[400px]">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="uppercase text-[10px] font-black tracking-widest text-amber-500 flex items-center gap-2"><ChartIcon className="w-4 h-4" /> Engine Pulse Dynamics</h3>
                  <button onClick={generateHealthReport} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase text-amber-500 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-2">
                    <FileText className="w-3 h-3" /> System Audit
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.timers.filter(t => t.value > 0).slice(0, 6).map(t => ({ name: t.label.split(' ')[0], value: t.value }))}>
                    <XAxis dataKey="name" stroke="#f59e0b" fontSize={9} axisLine={false} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.timers.map((e, index) => <Cell key={index} fill={`rgba(245, 158, 11, ${0.3 + (index / 10)})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-black border border-amber-500/20 rounded-2xl overflow-hidden flex flex-col h-64 shadow-2xl">
                <div className="bg-amber-500/10 p-3 border-b border-amber-500/20 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2"><Terminal className="w-3 h-3" /> System Bus</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                </div>
                <div className="p-4 font-mono text-[9px] text-amber-500/60 flex-1 overflow-y-auto space-y-1">
                  {[...logs].map((log, i) => <div key={i} className="truncate">{log}</div>)}
                </div>
                <form onSubmit={sendManualCommand} className="p-2 bg-amber-500/5 border-t border-amber-500/10 flex gap-2">
                  <input type="text" value={command} onChange={(e) => setCommand(e.target.value.toUpperCase())} placeholder="AT CMD..." className="flex-1 bg-black/40 border border-amber-500/20 rounded-lg px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-amber-500/50" />
                  <button type="submit" className="p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-all"><Send className="w-3 h-3" /></button>
                </form>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2"><Lock className="w-3 h-3" /> Link Diagnostics</h3>
                  <button onClick={releasePairing} className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-black rounded text-[8px] font-black uppercase border border-red-500/20 transition-all flex items-center gap-2"><RefreshCw className="w-3 h-3" /> Release Pairing</button>
                </div>
                <ul className="space-y-4 text-[9px] font-bold leading-relaxed text-amber-50/60 uppercase">
                  <li className="flex gap-3"><FolderTree className="w-4 h-4 text-amber-500 shrink-0" /> <span>Folder Mismatch: Service UUID folder ID must match V-LINK broadcast ID.</span></li>
                  <li className="flex gap-3"><ZapOff className="w-4 h-4 text-amber-500 shrink-0" /> <span>Silence on line: Hardware must return '&gt;' prompt to acknowledge AT handshake.</span></li>
                  <li className="flex gap-3"><Lock className="w-4 h-4 text-amber-500 shrink-0" /> <span>Exclusive Access: Other OBD apps (Torque/Fusion) must be completely closed.</span></li>
                </ul>
              </div>
              <div className="bg-amber-500 text-black p-6 rounded-2xl shadow-xl transition-all">
                <h3 className="text-sm font-black uppercase italic mb-4 flex items-center gap-2"><Info className="w-4 h-4" /> Hardware Status</h3>
                <p className="text-xs font-bold leading-relaxed">
                  {isConnected 
                    ? "OBD-II DATA FEED: ACTIVE. All system nodes responding." 
                    : isConnecting 
                    ? "INITIALIZING: Establishing hardware bridge. Check System Bus for TX logs."
                    : isSimulating 
                    ? "VIRTUAL FEED: Simulation of ISO 15765-4 network." 
                    : "SYSTEM STANDBY: Link offline. Click 'Connect OBD' to begin bridge."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ... gauges tab ... */}
        {activeTab === 'gauges' && (
          <div className={isHudMode ? "grid grid-cols-1 gap-12 w-full max-w-4xl" : "grid grid-cols-1 lg:grid-cols-4 gap-6"}>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Gauge hud={isHudMode} value={liveMetrics.rpm} label="RPM" unit="REV/MIN" max={8000} color="#f59e0b" />
              <Gauge hud={isHudMode} value={liveMetrics.speed} label="SPEED" unit="KM/H" max={220} color="#3b82f6" />
              <Gauge value={liveMetrics.temp.toFixed(1)} label="COOLANT" unit="°C" max={120} color="#ef4444" />
              <Gauge value={liveMetrics.volt.toFixed(1)} label="VOLTS" unit="V" max={16} color="#10b981" />
              <Gauge value={liveMetrics.load} label="LOAD" unit="%" max={100} color="#a855f7" />
              <Gauge value={liveMetrics.fuel.toFixed(1)} label="INSTANT" unit="L/100" max={30} color="#f97316" />
            </div>
            
            <div className="space-y-6">
              <div className="bg-zinc-900/40 border border-amber-500/20 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
                <Timer className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/60 mb-2">0-100 Performance</h3>
                <div className="text-4xl font-black font-mono tracking-tighter text-white mb-2">
                  {perfTimer.result > 0 ? perfTimer.result.toFixed(2) : (perfTimer.isRunning ? 'RUNNING' : 'READY')}
                </div>
                <p className="text-[8px] font-bold uppercase opacity-20">Seconds</p>
              </div>
              
              <div className="flex flex-col gap-4">
                <button onClick={() => setIsHudMode(true)} className="w-full py-4 bg-zinc-900 border border-amber-500/20 rounded-2xl text-amber-500 font-black uppercase text-[10px] hover:bg-amber-500 hover:text-black transition-all flex items-center justify-center gap-3">
                  <Maximize2 className="w-4 h-4" /> HUD Mode
                </button>
                <button onClick={toggleSimMode} className={`w-full py-4 border rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-3 ${isSimulating ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_#f59e0b44]' : 'bg-transparent text-amber-500 border-amber-500/20 hover:bg-amber-500/10'}`}>
                  <Play className="w-4 h-4" /> {isSimulating ? 'Stop Sim' : 'Start Sim'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'service' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900/30 border border-amber-500/10 p-8 rounded-3xl space-y-6">
              <h3 className="uppercase text-[10px] font-black tracking-widest text-amber-500 flex items-center gap-2"><Wrench className="w-4 h-4" /> Prognostic Analysis</h3>
              <div className="space-y-4">
                {[
                  { label: 'Oil Life Estimation', value: Math.max(100 - (ignitionCount / 5000) * 100, 0).toFixed(0), unit: '%', icon: Droplets, color: 'text-amber-500' },
                  { label: 'Spark Plug Life', value: Math.max(100 - (runTime / 3600000) * 100, 0).toFixed(0), unit: '%', icon: SparkPlug, color: 'text-blue-500' },
                  { label: 'Air Filter Health', value: '92', unit: '%', icon: Activity, color: 'text-green-500' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      <span className="text-[10px] font-bold uppercase opacity-60">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black font-mono">{item.value}</span>
                      <span className="text-[8px] font-bold opacity-40 ml-1">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-zinc-900/30 border border-amber-500/10 p-8 rounded-3xl">
              <h3 className="uppercase text-[10px] font-black tracking-widest text-amber-500 mb-8">Fleet Vital Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <h4 className="text-[8px] font-black uppercase opacity-40 mb-2">Lifetime Ignition Cycles</h4>
                  <p className="text-4xl font-black font-mono text-white">{ignitionCount.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <h4 className="text-[8px] font-black uppercase opacity-40 mb-2">Total Engine Run Time</h4>
                  <p className="text-4xl font-black font-mono text-white">{(runTime / 3600).toFixed(1)} <span className="text-sm">HRS</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... remaining tabs ... */}
        {activeTab === 'dtcs' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button onClick={requestDTCs} disabled={!isConnected} className="flex-1 py-4 bg-amber-500 text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3 hover:bg-amber-400 transition-all"><Stethoscope className="w-5 h-5" /> Scan System</button>
              <button onClick={clearDTCs} disabled={!isConnected} className="px-8 py-4 bg-red-600 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-3 hover:bg-red-500 transition-all"><Trash2 className="w-5 h-5" /> Clear Codes</button>
            </div>
            {data.dtcs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {data.dtcs.map((dtc, i) => (
                  <div key={i} className={`bg-zinc-900/40 border-l-4 p-6 rounded-2xl flex justify-between items-center ${dtc.severity === 'high' ? 'border-red-500' : 'border-amber-500'}`}>
                    <div><h4 className="text-2xl font-black font-mono text-white">{dtc.code}</h4><p className="text-xs text-amber-50/60 font-bold">{dtc.description}</p></div>
                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-white/5 border border-white/10">{dtc.severity}</span>
                  </div>
                ))}
              </div>
            ) : <div className="py-20 text-center border border-dashed border-amber-500/10 rounded-3xl text-amber-500/20 italic font-black uppercase tracking-widest">No Trouble Codes Detected</div>}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="bg-zinc-900/30 border border-amber-500/10 p-8 rounded-3xl h-[500px]">
            {data.telemetry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="time" stroke="#ffffff22" fontSize={8} />
                  <YAxis stroke="#ffffff22" fontSize={8} />
                  <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #f59e0b33' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                  {telemetryKeys.map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7'][i % 5]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-amber-500/20 italic">Awaiting Telemetry Ingress</div>}
        </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-zinc-900/30 border border-amber-500/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between bg-amber-500/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Archive Management</h3>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="px-4 py-2 border border-red-500/20 rounded text-[9px] font-black uppercase text-red-500 hover:bg-red-500 hover:text-black flex items-center gap-2"><Trash2 className="w-3 h-3" /> Clear All</button>
                <button onClick={exportData} className="px-4 py-2 border border-amber-500/20 rounded text-[9px] font-black uppercase hover:bg-amber-500 hover:text-black flex items-center gap-2"><Download className="w-3 h-3" /> Export Archive</button>
              </div>
            </div>
            <table className="w-full text-left font-mono text-[10px]">
              <tbody className="divide-y divide-white/5 opacity-60">
                {history.map((snap, i) => (
                  <tr key={i} className="hover:bg-white/5 cursor-pointer" onClick={() => loadHistoryItem(snap)}>
                    <td className="p-8">{new Date(snap.timestamp).toLocaleString()}</td>
                    <td className="p-8 uppercase text-amber-500/40">{snap.type}</td>
                    <td className="p-8 text-right"><ChevronRight className="w-4 h-4 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {!isHudMode && (
        <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-amber-500/20 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
            {isLive ? (
              <button onClick={toggleConnection} className={`px-6 py-3 font-black uppercase text-[10px] rounded-xl flex items-center gap-2 transition-all ${isConnected ? 'bg-red-600 text-white shadow-[0_0_20px_#dc262644]' : 'bg-white text-black hover:bg-amber-500'}`}>
                <Bluetooth className="w-4 h-4" /> {isConnected ? 'Disconnect' : 'Connect OBD'}
              </button>
            ) : (
              <button onClick={() => { setRawData(INITIAL_DATA); setIsLive(true); }} className="px-6 py-3 bg-white text-black font-black uppercase text-[10px] rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">Return to Live</button>
            )}
            <button onClick={() => { const input = prompt("PASTE DATA STREAM:"); if (input) { setRawData(input); setIsLive(true); saveSnapshot(); } }} className="px-8 py-3 bg-amber-500 text-black font-black uppercase text-[10px] rounded-xl hover:bg-amber-400 transition-all">Sync Ingress</button>
          </div>
        </footer>
      )}
    </div>
  );
}
