/**
 * Web Bluetooth OBD client — browser / dev preview.
 *
 * Key lessons from iOS BLE testing (IOS-Vlink adapter):
 *  1. Discover ALL services, then match by profile — don't filter upfront
 *  2. Detect write/notify chars by property flags, not hardcoded UUIDs
 *  3. Single-char fallback: if no dedicated write char, use the notify char
 *  4. Buffer until '>' prompt — don't split on '\r'
 *  5. ATCAF0 required in init sequence (CAN auto-format off)
 */
import { AdapterProfile } from '@/types/obd';
import { ADAPTER_PROFILES, ELM327_INIT, PIDS } from './adapterProfiles';
import { parseElmFrame } from './parser';
import { delay } from '@/lib/utils';

export class ObdBleClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
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

    // Discover ALL services (don't filter — some adapters don't advertise service UUIDs)
    const services = await this.server.getPrimaryServices();
    const found = services.map((s) => s.uuid.slice(0, 8)).join(', ');
    this.onLog(`PROF: Services found: ${found}`);

    // Try known profiles first
    for (const profile of ADAPTER_PROFILES) {
      const svc = services.find((s) => s.uuid === profile.service);
      if (!svc) continue;
      await this.resolveChars(svc, profile.name);
      if (this.writeChar && this.notifyChar) {
        this.profile = profile;
        this.onLog(`PROF: Matched ${profile.name}`);
        break;
      }
    }

    // Auto-probe fallback: take first service, detect chars by property
    if (!this.writeChar || !this.notifyChar) {
      const firstSvc = services[0];
      if (!firstSvc) throw new Error('No BLE services found on adapter');
      const autoName = `Auto-${firstSvc.uuid.slice(0, 8)}`;
      this.onLog(`PROF: No match — probing first service ${firstSvc.uuid.slice(0, 8)}`);
      await this.resolveChars(firstSvc, autoName);
      this.profile = {
        name: autoName,
        service: firstSvc.uuid,
        write: this.writeChar?.uuid ?? '',
        notify: this.notifyChar?.uuid ?? '',
      };
    }

    if (!this.writeChar || !this.notifyChar) {
      throw new Error('Required characteristics not found');
    }

    const props = this.notifyChar.properties;
    if (props.notify || props.indicate) {
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', this.handleNotification);
      this.onLog(`PROF: Notifications enabled on ${this.notifyChar.uuid.slice(0, 8)}`);
    }

    await this.initElm327();
    this.startPolling();

    return {
      success: true,
      deviceName: this.device.name ?? 'OBD Adapter',
      profileName: this.profile!.name,
    };
  }

  /** Detect write + notify characteristics by property flags, not hardcoded UUIDs */
  private async resolveChars(
    service: BluetoothRemoteGATTService,
    profileName: string,
  ): Promise<void> {
    const chars = await service.getCharacteristics();
    const charList = chars
      .map((c) => `${c.uuid.slice(0, 8)} [${c.properties.notify ? 'N' : ''}${c.properties.write ? 'W' : ''}${c.properties.writeWithoutResponse ? 'w' : ''}]`)
      .join(', ');
    this.onLog(`PROF: Chars (${profileName}): ${charList}`);

    for (const char of chars) {
      if ((char.properties.notify || char.properties.indicate) && !this.notifyChar) {
        this.notifyChar = char;
        this.onLog(`PROF: notify=${char.uuid.slice(0, 8)}`);
      }
      if ((char.properties.write || char.properties.writeWithoutResponse) && !this.writeChar) {
        this.writeChar = char;
        this.onLog(`PROF: write=${char.uuid.slice(0, 8)}`);
      }
    }

    // Single-char adapter fallback (some FFE0 adapters expose only FFE1 for both)
    if (!this.writeChar && this.notifyChar) {
      this.writeChar = this.notifyChar;
      this.onLog('PROF: Using notify char for write (single-char adapter)');
    }
  }

  /** Buffer incoming data until the ELM327 '>' prompt, then dispatch */
  private handleNotification = (e: Event) => {
    const target = e.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    const chunk = new TextDecoder().decode(target.value);
    this.buffer += chunk;

    if (!this.buffer.includes('>')) return;

    const response = this.buffer.replace('>', '').trim();
    this.buffer = '';
    if (!response) return;

    const preview = response.slice(0, 40).replace(/\r/g, ' ');
    this.onLog(`RX ← ${preview}`);

    const patch = parseElmFrame(response, {} as never);
    if (patch) this.onTelemetry(patch as Record<string, number>);
  };

  private async write(command: string) {
    if (!this.writeChar) return;
    const data = new TextEncoder().encode(command + '\r');
    this.onLog(`TX → ${command}`);
    if (this.writeChar.properties.writeWithoutResponse) {
      await this.writeChar.writeValueWithoutResponse(data);
    } else {
      await this.writeChar.writeValueWithResponse(data);
    }
  }

  private async initElm327() {
    this.onLog(`INIT: Starting ELM327 init (${ELM327_INIT.length} steps)`);
    for (let i = 0; i < ELM327_INIT.length; i++) {
      const cmd = ELM327_INIT[i];
      this.onLog(`INIT: ${i + 1}/${ELM327_INIT.length} · ${cmd}`);
      await this.write(cmd);
      await delay(180);
    }
    this.onLog('INIT: Complete — starting PID poll');
  }

  private startPolling() {
    const cycle = Object.values(PIDS);
    this.pollTimer = setInterval(async () => {
      try {
        await this.write(cycle[this.pidIdx]);
        this.pidIdx = (this.pidIdx + 1) % cycle.length;
      } catch (e: unknown) {
        this.onLog(`POLL ERR: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, 350);
  }

  async disconnect() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.notifyChar) {
      try { await this.notifyChar.stopNotifications(); } catch {}
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.handleNotification);
    }
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.profile = null;
    this.buffer = '';
    this.onLog('LINK: Disconnected');
  }
}
