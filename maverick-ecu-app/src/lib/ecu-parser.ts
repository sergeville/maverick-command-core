export interface ECUModule {
  name: string;
  assemblyVer?: string;
  softwareNum?: string;
  serialNum?: string;
  vin?: string;
  bootId?: string;
}

export interface GenericPID {
  name: string;
  value: string | number;
  unit?: string;
  description?: string;
  code?: string;
}

export interface TelemetryPoint {
  time: string;
  metrics: Record<string, number | string>;
}

export interface DTC {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ECUData {
  timestamp: string;
  vin?: string;
  protocol?: string;
  ecuAddress?: string;
  timers: {
    label: string;
    value: number;
    category: 'Off-Cycle' | 'Engine' | 'Coasting';
  }[];
  modules: ECUModule[];
  genericPIDs: GenericPID[];
  telemetry: TelemetryPoint[];
  dtcs: DTC[];
  type: 'ford-ecu-dump' | 'generic-pids' | 'telemetry-csv' | 'obd-hex' | 'unknown';
}

const DTC_DICTIONARY: Record<string, string> = {
  'P0101': 'Mass Air Flow (MAF) Circuit Range/Performance Problem',
  'P0300': 'Random or Multiple Cylinder Misfire Detected',
  'P0420': 'Catalyst System Efficiency Below Threshold (Bank 1)',
  'P0171': 'System Too Lean (Bank 1)',
  'P0500': 'Vehicle Speed Sensor Malfunction',
  'P0700': 'Transmission Control System Malfunction',
  'P0113': 'Intake Air Temperature Sensor 1 Circuit High',
  'P0118': 'Engine Coolant Temperature Sensor 1 Circuit High'
};

/**
 * Standard OBD-II PID Decoders (Mode 01)
 */
export const PID_DECODERS: Record<string, (hex: string) => Partial<GenericPID>> = {
  '010C': (hex) => {
    const val = (parseInt(hex.slice(0, 2), 16) * 256 + parseInt(hex.slice(2, 4), 16)) / 4;
    return { name: 'Engine RPM', value: Math.floor(val), unit: 'RPM' };
  },
  '010D': (hex) => {
    return { name: 'Vehicle Speed', value: parseInt(hex, 16), unit: 'KM/H' };
  },
  '0105': (hex) => {
    return { name: 'Coolant Temp', value: parseInt(hex, 16) - 40, unit: '°C' };
  },
  '010F': (hex) => {
    return { name: 'Intake Air Temp', value: parseInt(hex, 16) - 40, unit: '°C' };
  },
  '0111': (hex) => {
    return { name: 'Throttle Pos', value: Math.floor((parseInt(hex, 16) * 100) / 255), unit: '%' };
  },
  '0146': (hex) => {
    return { name: 'Ambient Temp', value: parseInt(hex, 16) - 40, unit: '°C' };
  }
};

export function decodeDTCResponse(hex: string): DTC[] {
  const parts = hex.split(' ').filter(p => p.length === 2);
  if (parts[0] !== '43' && parts[0] !== '47') return [];

  const dtcs: DTC[] = [];
  for (let i = 2; i < parts.length; i += 2) {
    const byte1 = parts[i];
    const byte2 = parts[i+1];
    if (!byte1 || !byte2 || (byte1 === '00' && byte2 === '00')) continue;

    const firstChar = byte1[0];
    let prefix = '';
    switch(firstChar) {
      case '0': prefix = 'P0'; break;
      case '1': prefix = 'P1'; break;
      case '2': prefix = 'P2'; break;
      case '3': prefix = 'P3'; break;
      case '4': prefix = 'C0'; break;
      case '5': prefix = 'C1'; break;
      case '6': prefix = 'C2'; break;
      case '7': prefix = 'C3'; break;
      case '8': prefix = 'B0'; break;
      case '9': prefix = 'B1'; break;
      case 'A': prefix = 'B2'; break;
      case 'B': prefix = 'B3'; break;
      case 'C': prefix = 'U0'; break;
      case 'D': prefix = 'U1'; break;
      case 'E': prefix = 'U2'; break;
      case 'F': prefix = 'U3'; break;
    }

    const code = prefix + byte1[1] + byte2;
    dtcs.push({
      code,
      description: DTC_DICTIONARY[code] || 'Manufacturer Specific Fault Code.',
      severity: code.startsWith('P03') ? 'high' : 'medium'
    });
  }
  return dtcs;
}

export function parseRawECUData(raw: string): ECUData {
  const data: ECUData = {
    timestamp: new Date().toISOString(),
    timers: [],
    modules: [],
    genericPIDs: [],
    telemetry: [],
    dtcs: [],
    type: 'unknown'
  };

  if (!raw || raw.trim().length === 0) return data;

  // Mode 01 Response Decoding (e.g., "41 0C 1A F0")
  if (raw.startsWith('41')) {
    const parts = raw.split(' ');
    const pid = '01' + parts[1];
    const hexVal = parts.slice(2).join('');
    if (PID_DECODERS[pid]) {
      const decoded = PID_DECODERS[pid](hexVal);
      data.type = 'generic-pids';
      data.genericPIDs = [{
        name: decoded.name!,
        value: decoded.value!,
        unit: decoded.unit,
        code: pid
      }];
      return data;
    }
  }

  if (raw.startsWith('43') || raw.startsWith('47')) {
    data.type = 'obd-hex';
    data.dtcs = decodeDTCResponse(raw);
    return data;
  }

  // Detect DTCs in text
  const dtcMatches = raw.match(/[PCBU][0-9A-F]{4}/g);
  if (dtcMatches) {
    data.dtcs = Array.from(new Set(dtcMatches)).map(code => ({
      code,
      description: DTC_DICTIONARY[code] || 'Manufacturer Specific Fault Code.',
      severity: code.startsWith('P03') ? 'high' : 'medium'
    }));
  }

  // JSON Parsing
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json)) {
      data.type = 'generic-pids';
      data.genericPIDs = json.map((item: any) => ({
        name: item.Name || item.name || 'Unknown PID',
        value: item.Value || item.value || '0',
        unit: item.Unit || item.unit || ''
      }));
      return data;
    }
  } catch (e) {}

  // CSV Parsing
  if (raw.includes('","') || (raw.includes(',') && raw.split('\n')[0].includes('Time'))) {
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      data.type = 'telemetry-csv';
      data.telemetry = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const point: TelemetryPoint = { time: values[0], metrics: {} };
        headers.forEach((h, i) => {
          if (i === 0) return;
          point.metrics[h] = values[i] || '0';
        });
        return point;
      });
      return data;
    }
  }

  // Ford ECU Text Dump Parsing
  if (raw.includes('ECU protocol:') || raw.includes('Module Details')) {
    data.type = 'ford-ecu-dump';
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let currentModule: Partial<ECUModule> | null = null;

    lines.forEach(line => {
      if (line.startsWith('ECU protocol:')) data.protocol = line.split(':')[1].trim();
      if (line.startsWith('VIN:') && !currentModule) data.vin = line.split(':')[1].trim();

      if (line.includes('[seconds]:') || line.includes('Counter (')) {
        const match = line.match(/(.*?) (?:\[seconds\]:|\(Recent\):|\(Lifetime\):) (.*)/);
        if (match) {
          data.timers.push({
            label: match[1].trim(),
            value: parseInt(match[2].trim()),
            category: line.includes('Off-Cycle') ? 'Off-Cycle' : 'Engine'
          });
        }
      }

      if (line.match(/^[A-Z\/]{2,10}$/) || line === 'BCMC/BJB' || line === 'SOBDMC') {
        if (currentModule) data.modules.push(currentModule as ECUModule);
        currentModule = { name: line };
      }

      if (currentModule) {
        if (line.startsWith('Assembly ver.:')) currentModule.assemblyVer = line.split(':')[1].trim();
        if (line.startsWith('ECU Software Number.:')) currentModule.softwareNum = line.split(':')[1].trim();
        if (line.startsWith('ECU serial number:')) currentModule.serialNum = line.split(':')[1].trim();
      }
    });
    if (currentModule) data.modules.push(currentModule as ECUModule);
  }

  return data;
}
