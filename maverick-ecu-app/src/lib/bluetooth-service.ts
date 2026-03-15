/**
 * Key lessons from iOS BLE testing (IOS-Vlink adapter):
 *  1. Discover ALL services upfront via getPrimaryServices() — don't probe one-by-one
 *  2. Detect write/notify chars by property flags, not hardcoded UUIDs
 *  3. Single-char fallback: if no dedicated write char, use the notify char
 *  4. Buffer until '>' prompt (already done here — keep it)
 *  5. ATCAF0 required in full init sequence (CAN auto-format off)
 *  6. Use standard ELM327 uppercase AT commands — no case-switching needed
 */

const ELM327_INIT = [
  { cmd: 'ATZ',    desc: 'Reset' },
  { cmd: 'ATE0',   desc: 'Echo off' },
  { cmd: 'ATL0',   desc: 'Linefeeds off' },
  { cmd: 'ATS0',   desc: 'Spaces off' },
  { cmd: 'ATH0',   desc: 'Headers off' },
  { cmd: 'ATCAF0', desc: 'CAN auto-format off' },
  { cmd: 'ATSP0',  desc: 'Auto protocol' },
];

const KNOWN_SERVICES = [
  '0000ffe0-0000-1000-8000-00805f9b34fb', // IOS-VLink / FFEx
  '0000fff0-0000-1000-8000-00805f9b34fb', // V-LINK / FFFx
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / V-LINK BLE
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '00001101-0000-1000-8000-00805f9b34fb', // SPP
];

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataReceived: (data: string) => void;
  private responseBuffer = '';
  private resolveCommand: ((value: string) => void) | null = null;

  constructor(onDataReceived: (data: string) => void) {
    this.onDataReceived = onDataReceived;
  }

  async connect(): Promise<{ success: boolean; info?: string }> {
    try {
      this.onDataReceived('LINK: Requesting BLE device…');
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES,
      });

      if (!this.device?.gatt) throw new Error('Hardware link rejected');

      this.onDataReceived(`LINK: Connecting to ${this.device.name ?? 'Unknown'}…`);
      this.server = await this.device.gatt.connect();

      // Discover ALL services upfront
      const services = await this.server.getPrimaryServices();
      const found = services.map((s) => s.uuid.slice(0, 8)).join(', ');
      this.onDataReceived(`PROF: Services found: ${found}`);

      // Try known services first, detect chars by property flags
      for (const svcUuid of KNOWN_SERVICES) {
        const svc = services.find((s) => s.uuid === svcUuid);
        if (!svc) continue;
        await this.resolveChars(svc);
        if (this.writeChar && this.notifyChar) break;
      }

      // Auto-probe fallback: first service, property-based detection
      if (!this.writeChar || !this.notifyChar) {
        const firstSvc = services[0];
        if (!firstSvc) throw new Error('No BLE services found on adapter');
        this.onDataReceived(`PROF: No match — probing first service ${firstSvc.uuid.slice(0, 8)}`);
        await this.resolveChars(firstSvc);
      }

      if (!this.notifyChar) throw new Error('Required characteristics not found');

      const props = this.notifyChar.properties;
      if (props.notify || props.indicate) {
        await this.notifyChar.startNotifications();
        this.notifyChar.addEventListener('characteristicvaluechanged', this.handleNotifications);
        this.onDataReceived(`PROF: Notifications enabled on ${this.notifyChar.uuid.slice(0, 8)}`);
      } else {
        this.onDataReceived('WARN: Char has no notify — polling mode only');
      }

      // Brief warm-up
      await new Promise((r) => setTimeout(r, 500));

      await this.runHandshake();

      return { success: true, info: this.device.name ?? 'OBD Adapter' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.onDataReceived(`FATAL: ${msg}`);
      return { success: false, info: msg };
    }
  }

  /** Detect write + notify characteristics by property flags */
  private async resolveChars(service: BluetoothRemoteGATTService): Promise<void> {
    const chars = await service.getCharacteristics();
    const charList = chars
      .map((c) => `${c.uuid.slice(0, 8)} [${c.properties.notify ? 'N' : ''}${c.properties.write ? 'W' : ''}${c.properties.writeWithoutResponse ? 'w' : ''}]`)
      .join(', ');
    this.onDataReceived(`PROF: Chars: ${charList}`);

    for (const char of chars) {
      if ((char.properties.notify || char.properties.indicate) && !this.notifyChar) {
        this.notifyChar = char;
        this.onDataReceived(`PROF: notify=${char.uuid.slice(0, 8)}`);
      }
      if ((char.properties.write || char.properties.writeWithoutResponse) && !this.writeChar) {
        this.writeChar = char;
        this.onDataReceived(`PROF: write=${char.uuid.slice(0, 8)}`);
      }
    }

    // Single-char adapter fallback (some adapters expose only one characteristic)
    if (!this.writeChar && this.notifyChar) {
      this.writeChar = this.notifyChar;
      this.onDataReceived('PROF: Using notify char for write (single-char adapter)');
    }
  }

  private async runHandshake(): Promise<void> {
    this.onDataReceived(`INIT: Starting ELM327 init (${ELM327_INIT.length} steps)`);
    for (let i = 0; i < ELM327_INIT.length; i++) {
      const { cmd, desc } = ELM327_INIT[i];
      this.onDataReceived(`INIT: ${i + 1}/${ELM327_INIT.length} · ${cmd} (${desc})`);
      const response = await this.sendCommandAndWait(cmd);
      this.onDataReceived(`RX ← ${response}`);
    }
    this.onDataReceived('INIT: Complete');
  }

  private handleNotifications = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const chunk = new TextDecoder().decode(target.value);
    this.responseBuffer += chunk;

    if (!this.responseBuffer.includes('>')) return;

    const clean = this.responseBuffer.replace('>', '').trim();
    this.responseBuffer = '';

    if (this.resolveCommand) {
      this.resolveCommand(clean);
      this.resolveCommand = null;
    } else if (clean) {
      const preview = clean.slice(0, 40).replace(/\r/g, ' ');
      this.onDataReceived(`RX ← ${preview}`);
    }
  };

  async sendCommandAndWait(command: string): Promise<string> {
    return new Promise((resolve) => {
      this.resolveCommand = resolve;
      this.sendCommand(command).catch(() => resolve('ERR'));
      setTimeout(() => {
        if (this.resolveCommand) {
          this.resolveCommand('TIMEOUT');
          this.resolveCommand = null;
        }
      }, 3000);
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.writeChar) return;
    const data = new TextEncoder().encode(command + '\r');
    this.onDataReceived(`TX → ${command}`);
    if (this.writeChar.properties.writeWithoutResponse) {
      await this.writeChar.writeValueWithoutResponse(data);
    } else {
      await this.writeChar.writeValueWithResponse(data);
    }
  }

  async disconnect(): Promise<void> {
    if (this.notifyChar) {
      try { await this.notifyChar.stopNotifications(); } catch {}
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.handleNotifications);
    }
    if (this.device?.gatt?.connected) {
      this.onDataReceived('LINK: Disconnecting…');
      this.device.gatt.disconnect();
    }
    this.writeChar = null;
    this.notifyChar = null;
    this.onDataReceived('LINK: Disconnected');
  }

  async release(): Promise<void> {
    await this.disconnect();
    try {
      if (this.device && 'forget' in this.device) {
        this.onDataReceived('LINK: Revoking browser permissions…');
        await (this.device as BluetoothDevice & { forget(): Promise<void> }).forget();
      }
    } catch (e: unknown) {
      this.onDataReceived(`ERROR: Release failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.device = null;
    this.server = null;
    this.onDataReceived('LINK: All hardware references released');
  }
}
