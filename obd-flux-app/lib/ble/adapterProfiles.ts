import { AdapterProfile } from '@/types/obd';

export const ADAPTER_PROFILES: AdapterProfile[] = [
  {
    name: 'V-LINK / FFFx',
    service: '0000fff0-0000-1000-8000-00805f9b34fb',
    write:   '0000fff2-0000-1000-8000-00805f9b34fb',
    notify:  '0000fff1-0000-1000-8000-00805f9b34fb',
  },
  {
    name: 'Nordic UART',
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    write:   '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notify:  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    name: 'ISSC / V-LINK BLE',
    service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    write:   '49535343-8841-43f4-a8d4-ecbe34729bb3',
    notify:  '49535343-1e4d-4bd9-ba61-07c6435a7e56',
  },
];

export const PIDS = {
  RPM:                    '010C',
  SPEED:                  '010D',
  ENGINE_LOAD:            '0104',
  COOLANT_TEMP:           '0105',
  THROTTLE:               '0111',
  CONTROL_MODULE_VOLTAGE: '0142',
} as const;

export const ELM327_INIT = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'];
