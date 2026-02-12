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
  type: 'ford-ecu-dump' | 'generic-pids' | 'telemetry-csv' | 'unknown';
}

const DTC_DICTIONARY: Record<string, string> = {
  'P0101': 'Mass Air Flow (MAF) Circuit Range/Performance Problem',
  'P0300': 'Random or Multiple Cylinder Misfire Detected',
  'P0420': 'Catalyst System Efficiency Below Threshold (Bank 1)',
  'P0171': 'System Too Lean (Bank 1)',
  'P0500': 'Vehicle Speed Sensor Malfunction',
  'P0700': 'Transmission Control System Malfunction'
};

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

  // Detect DTCs (Pattern like P0123, C1234, etc)
  const dtcMatches = raw.match(/[PCBU][0-9A-F]{4}/g);
  if (dtcMatches) {
    data.dtcs = Array.from(new Set(dtcMatches)).map(code => ({
      code,
      description: DTC_DICTIONARY[code] || 'Manufacturer Specific Fault Code.',
      severity: code.startsWith('P03') ? 'high' : 'medium'
    }));
  }

  // 1. Try parsing as JSON
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json)) {
      data.type = 'generic-pids';
      data.genericPIDs = json.map((item: any) => ({
        name: item.Name || item.name || item.ShortName || 'Unknown PID',
        value: item.Value || item.value || item.ValueString || '0',
        unit: item.Unit || item.unit || '',
        description: item.Description || item.description || ''
      }));
      return data;
    }
  } catch (e) {}

  // 2. Try parsing as CSV
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
      
      const lastPoint = data.telemetry[data.telemetry.length - 1];
      if (lastPoint) {
        data.genericPIDs = Object.entries(lastPoint.metrics).map(([name, value]) => ({
          name,
          value,
          unit: name.match(/\[(.*?)\]/)?.[1] || ''
        }));
      }
      return data;
    }
  }

  // 3. Ford ECU Text Dump Parsing
  if (raw.includes('ECU protocol:') || raw.includes('Module Details')) {
    data.type = 'ford-ecu-dump';
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let currentModule: Partial<ECUModule> | null = null;

    lines.forEach(line => {
      if (line.startsWith('ECU protocol:')) data.protocol = line.split(':')[1].trim();
      if (line.startsWith('ECU address/CAN Id:')) data.ecuAddress = line.split(':')[1].trim();
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
        if (line.startsWith('VIN:')) currentModule.vin = line.split(':')[1].trim();
      }
    });

    if (currentModule) data.modules.push(currentModule as ECUModule);
  }

  return data;
}
