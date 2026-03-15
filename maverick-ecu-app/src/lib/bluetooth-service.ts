export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataReceived: (data: string) => void;
  private responseBuffer: string = '';
  private resolveCommand: ((value: string) => void) | null = null;

  // Expanded list including ISSC (common for IOS-Vlink)
  private static COMMON_SERVICES = [
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ae00-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / V-LINK Specific
    '00001101-0000-1000-8000-00805f9b34fb'  // SPP
  ];

  private static CHARACTERISTIC_MAP: Record<string, string> = {
    '0000fff0-0000-1000-8000-00805f9b34fb': '0000fff1-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb': '0000ffe1-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb': '00002af0-0000-1000-8000-00805f9b34fb',
    '0000ae00-0000-1000-8000-00805f9b34fb': '0000ae01-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455': '49535343-1e4d-4bd9-ba61-07c6435a7e56', // ISSC Data
    '00001101-0000-1000-8000-00805f9b34fb': '00001101-0000-1000-8000-00805f9b34fb'
  };

  constructor(onDataReceived: (data: string) => void) {
    this.onDataReceived = onDataReceived;
  }

  async connect(): Promise<{ success: boolean; info?: string }> {
    try {
      this.onDataReceived("LINK: Initializing Deep Scan...");
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BluetoothService.COMMON_SERVICES
      });

      if (!this.device || !this.device.gatt) throw new Error('Hardware link rejected');

      this.onDataReceived(`LINK: Linking to ${this.device.name}...`);
      this.server = await this.device.gatt.connect();
      this.onDataReceived("LINK: GATT linked. Probing for Data Pipes...");

      // Try known pipes first
      for (const serviceUuid of BluetoothService.COMMON_SERVICES) {
        try {
          this.onDataReceived(`BUS: Testing ${serviceUuid.split('-')[0]}...`);
          const service = await this.server.getPrimaryService(serviceUuid);
          const charUuid = BluetoothService.CHARACTERISTIC_MAP[serviceUuid];
          this.characteristic = await service.getCharacteristic(charUuid);
          
          if (this.characteristic) {
            this.onDataReceived(`SUCCESS: Data pipe ${charUuid.split('-')[0]} established.`);
            break;
          }
        } catch (e) { continue; }
      }

      // If known pipes fail, perform a full inventory
      if (!this.characteristic) {
        this.onDataReceived("WARN: Known pipes failed. Performing Full Inventory...");
        try {
          const services = await this.server.getPrimaryServices();
          services.forEach(s => this.onDataReceived(`INVENTORY: Found Service ${s.uuid}`));
        } catch (e) {
          this.onDataReceived("INVENTORY: Could not enumerate — add service UUID to optionalServices.");
        }
        throw new Error('Pipe mismatch. Check Inventory logs.');
      }

      const props = this.characteristic.properties;
      if (props.notify || props.indicate) {
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications);
      } else {
        this.onDataReceived("WARN: Char has no notify — polling mode only.");
      }
      this.onDataReceived("LINK: Pipe Open. Waiting for hardware stability...");
      await new Promise(r => setTimeout(r, 1000)); // 1s Warm-up

      this.onDataReceived("HANDSHAKE: Initializing polite protocol...");

      const handshake = [
        { cmd: 'AT I', desc: 'Identify Chip' },
        { cmd: 'AT Z', desc: 'Reset' },
        { cmd: 'AT E0', desc: 'Echo Off' },
        { cmd: 'AT SP 0', desc: 'Auto Protocol' }
      ];

      for (const step of handshake) {
        this.onDataReceived(`TX: ${step.cmd.toLowerCase()} (${step.desc})`);
        // Try lowercase which is more compatible with some V-LINK firmwares
        const response = await this.sendCommandAndWait(step.cmd.toLowerCase());
        this.onDataReceived(`RX: ${response}`);
        
        if (response === "TIMEOUT" || response === "ERR") {
          this.onDataReceived(`RETRY: Trying Uppercase for ${step.cmd}...`);
          const retryResp = await this.sendCommandAndWait(step.cmd.toUpperCase());
          this.onDataReceived(`RX: ${retryResp}`);
        }
      }
      
      return { success: true, info: this.device.name };
    } catch (error: any) {
      this.onDataReceived(`FATAL: ${error.message}`);
      return { success: false, info: error.message };
    }
  }

  private handleNotifications = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    
    const chunk = new TextDecoder().decode(target.value);
    this.responseBuffer += chunk;

    if (this.responseBuffer.includes('>')) {
      const clean = this.responseBuffer.replace('>', '').trim();
      if (this.resolveCommand) {
        this.resolveCommand(clean);
        this.resolveCommand = null;
      } else if (clean) {
        this.onDataReceived(clean);
      }
      this.responseBuffer = '';
    }
  };

  async sendCommandAndWait(command: string): Promise<string> {
    return new Promise((resolve) => {
      this.resolveCommand = resolve;
      this.sendCommand(command).catch(() => resolve("ERR"));
      setTimeout(() => {
        if (this.resolveCommand) {
          this.resolveCommand("TIMEOUT");
          this.resolveCommand = null;
        }
      }, 3000);
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.characteristic) return;
    const data = new TextEncoder().encode(command + '\r');
    const props = this.characteristic.properties;
    if (props.writeWithoutResponse) {
      await this.characteristic.writeValueWithoutResponse(data);
    } else {
      await this.characteristic.writeValueWithResponse(data);
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.onDataReceived("LINK: Severing GATT connection...");
      this.device.gatt.disconnect();
    }
  }

  async release() {
    try {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect();
      }
      
      // Attempt to revoke browser permissions if supported
      if (this.device && 'forget' in this.device) {
        this.onDataReceived("LINK: Revoking browser permissions (Forget)...");
        await (this.device as any).forget();
      }

      this.device = null;
      this.server = null;
      this.characteristic = null;
      this.onDataReceived("LINK: All hardware references released. System ready for fresh discovery.");
    } catch (e: any) {
      this.onDataReceived(`ERROR: Release failed: ${e.message}`);
    }
  }
}
