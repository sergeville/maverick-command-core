/**
 * Web Bluetooth OBD client — browser / dev preview.
 * On iPhone, swap this for the Capacitor BLE version in codex_handoff_obd_flux.
 */
import { AdapterProfile } from '@/types/obd';
import { ADAPTER_PROFILES, ELM327_INIT, PIDS } from './adapterProfiles';
import { parseElmFrame } from './parser';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class ObdBleClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private profile: AdapterProfile | null = null;
  private buffer = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pidIdx = 0;

  constructor(
    private onTelemetry: (patch: Record<string, number>) => void,
    private onLog: (msg: string) => void,
  ) {}

  async connect(): Promise<{ success: boolean; deviceName: string; profileName: string }> {
    this.onLog('SCAN: Requesting BLE device…');
    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ADAPTER_PROFILES.map((p) => p.service),
    });

    if (!this.device.gatt) throw new Error('No GATT on device');
    this.onLog(`LINK: Connecting to ${this.device.name ?? 'Unknown'}…`);
    this.server = await this.device.gatt.connect();

    // Probe profiles
    for (const profile of ADAPTER_PROFILES) {
      try {
        const svc = await this.server.getPrimaryService(profile.service);
        this.characteristic = await svc.getCharacteristic(profile.notify);
        this.profile = profile;
        this.onLog(`PIPE: ${profile.name} matched`);
        break;
      } catch {
        continue;
      }
    }

    if (!this.characteristic || !this.profile) {
      throw new Error('No compatible BLE serial profile found');
    }

    const props = this.characteristic.properties;
    if (props.notify || props.indicate) {
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotification);
    }

    await this.initElm327();
    this.startPolling();

    return {
      success: true,
      deviceName: this.device.name ?? 'OBD Adapter',
      profileName: this.profile.name,
    };
  }

  private handleNotification = (e: Event) => {
    const target = e.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    const chunk = new TextDecoder().decode(target.value);
    this.buffer += chunk;
    const frames = this.buffer.split('\r');
    this.buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const patch = parseElmFrame(frame, {} as never);
      if (patch) this.onTelemetry(patch as Record<string, number>);
    }
  };

  private async write(command: string) {
    if (!this.server || !this.profile) return;
    const writeChar = await this.server
      .getPrimaryService(this.profile.service)
      .then((s) => s.getCharacteristic(this.profile!.write));
    const data = new TextEncoder().encode(command + '\r');
    const props = writeChar.properties;
    if (props.writeWithoutResponse) {
      await writeChar.writeValueWithoutResponse(data);
    } else {
      await writeChar.writeValueWithResponse(data);
    }
  }

  private async initElm327() {
    this.onLog('HANDSHAKE: ELM327 init…');
    for (const cmd of ELM327_INIT) {
      await this.write(cmd);
      await delay(180);
    }
    this.onLog('READY: ELM327 initialized');
  }

  private startPolling() {
    const cycle = Object.values(PIDS);
    this.pollTimer = setInterval(async () => {
      try {
        await this.write(cycle[this.pidIdx]);
        this.pidIdx = (this.pidIdx + 1) % cycle.length;
      } catch (e: any) {
        this.onLog(`POLL ERR: ${e.message}`);
      }
    }, 350);
  }

  async disconnect() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.characteristic) {
      try { await this.characteristic.stopNotifications(); } catch {}
      this.characteristic.removeEventListener('characteristicvaluechanged', this.handleNotification);
    }
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.profile = null;
    this.buffer = '';
  }
}
