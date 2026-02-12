export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataReceived: (data: string) => void;
  private responseBuffer: string = '';

  private static COMMON_SERVICES = [
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ae00-0000-1000-8000-00805f9b34fb'
  ];

  private static CHARACTERISTIC_MAP: Record<string, string> = {
    '0000fff0-0000-1000-8000-00805f9b34fb': '0000fff1-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb': '0000ffe1-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb': '00002af0-0000-1000-8000-00805f9b34fb',
    '0000ae00-0000-1000-8000-00805f9b34fb': '0000ae01-0000-1000-8000-00805f9b34fb'
  };

  constructor(onDataReceived: (data: string) => void) {
    this.onDataReceived = onDataReceived;
  }

  async connect(): Promise<{ success: boolean; info?: string }> {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'V-LINK' },
          { namePrefix: 'IOS-Vlink' },
          { namePrefix: 'OBD' },
          { namePrefix: 'ELM327' },
          { namePrefix: 'OBDII' }
        ],
        optionalServices: BluetoothService.COMMON_SERVICES
      });

      if (!this.device || !this.device.gatt) return { success: false };

      this.server = await this.device.gatt.connect();
      // ... rest of the logic

      for (const serviceUuid of BluetoothService.COMMON_SERVICES) {
        try {
          const service = await this.server.getPrimaryService(serviceUuid);
          const charUuid = BluetoothService.CHARACTERISTIC_MAP[serviceUuid];
          this.characteristic = await service.getCharacteristic(charUuid);
          
          if (this.characteristic) break;
        } catch (e) { continue; }
      }

      if (!this.characteristic) throw new Error('Service discovery failed');

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications);

      // Robust ELM327 Handshake for V-LINK
      const initCommands = [
        'AT Z',   // Reset
        'AT E0',  // Echo off
        'AT L0',  // Linefeeds off
        'AT S0',  // Spaces off
        'AT SP 0',// Auto protocol
        'AT I'    // Identify
      ];

      for (const cmd of initCommands) {
        await this.sendCommand(cmd);
        await new Promise(r => setTimeout(r, 300));
      }
      
      return { success: true, info: `Link Established: ${this.device.name}` };
    } catch (error: any) {
      console.error('BT Error:', error);
      return { success: false, info: error.message };
    }
  }

  private handleNotifications = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    
    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(target.value);
    this.responseBuffer += chunk;

    if (this.responseBuffer.includes('>')) {
      const cleanData = this.responseBuffer.replace('>', '').trim();
      if (cleanData) this.onDataReceived(cleanData);
      this.responseBuffer = '';
    }
  };

  async sendCommand(command: string): Promise<void> {
    if (!this.characteristic) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\r');
    await this.characteristic.writeValue(data);
  }

  disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
  }
}
