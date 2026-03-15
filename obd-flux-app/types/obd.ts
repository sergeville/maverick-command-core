export type Telemetry = {
  rpm: number;
  speed: number;
  coolant: number;
  throttle: number;
  load: number;
  fuelRate: number;
  voltage: number;
};

export type HistoryPoint = {
  t: string;
  rpm: number;
  speed: number;
  load: number;
};

export type AdapterProfile = {
  name: string;
  service: string;
  write: string;
  notify: string;
};

export type ConnectionMode = 'mock' | 'live';
export type ConnectionStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';
