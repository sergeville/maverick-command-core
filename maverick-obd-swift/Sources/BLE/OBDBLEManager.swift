import CoreBluetooth
import Foundation

enum ConnectionState: Equatable {
    case idle
    case scanning
    case connecting
    case initializing
    case connected(profileName: String, deviceName: String)
    case error(String)

    var isConnected: Bool {
        if case .connected = self { return true }
        return false
    }

    var statusText: String {
        switch self {
        case .idle:                              return "STANDBY"
        case .scanning:                         return "SCANNING…"
        case .connecting:                       return "CONNECTING…"
        case .initializing:                     return "INITIALIZING…"
        case .connected(let p, let d):          return "\(d) · \(p)"
        case .error(let msg):                   return "ERR: \(msg)"
        }
    }
}

final class OBDBLEManager: NSObject, ObservableObject {
    @Published var state: ConnectionState = .idle
    @Published var telemetry = Telemetry.zero
    @Published var history: [HistoryPoint] = []
    @Published var log: [String] = []

    private var central: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var writeChar: CBCharacteristic?
    private var notifyChar: CBCharacteristic?
    private var activeProfile: AdapterProfile?

    private var responseBuffer = ""
    private var initIndex = 0
    private var pidIndex = 0
    private var pollTimer: Timer?

    private let maxHistory = 120
    private let pollInterval: TimeInterval = 0.25

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: .main)
    }

    // MARK: - Public API

    func connect() {
        guard central.state == .poweredOn else {
            addLog("ERR: Bluetooth not powered on")
            return
        }
        state = .scanning
        addLog("SCAN: Scanning for OBD adapter…")
        central.scanForPeripherals(withServices: AdapterProfile.serviceUUIDs, options: nil)
    }

    func disconnect() {
        pollTimer?.invalidate()
        pollTimer = nil
        if let p = peripheral { central.cancelPeripheralConnection(p) }
        reset()
        state = .idle
        addLog("LINK: Disconnected")
    }

    // MARK: - Private

    private func reset() {
        peripheral = nil
        writeChar = nil
        notifyChar = nil
        activeProfile = nil
        responseBuffer = ""
        initIndex = 0
        pidIndex = 0
    }

    private func addLog(_ msg: String) {
        let t = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        log.append("[\(t)] \(msg)")
        if log.count > 60 { log.removeFirst() }
    }

    private func send(_ command: String) {
        guard let char = writeChar, let p = peripheral else { return }
        let data = (command + "\r").data(using: .utf8)!
        let type: CBCharacteristicWriteType = char.properties.contains(.writeWithoutResponse)
            ? .withoutResponse : .withResponse
        p.writeValue(data, for: char, type: type)
    }

    private func startInit() {
        state = .initializing
        initIndex = 0
        addLog("INIT: Starting ELM327 init sequence")
        sendNextInit()
    }

    private func sendNextInit() {
        guard initIndex < ELM327.initSequence.count else {
            addLog("INIT: Complete — starting PID poll")
            startPolling()
            return
        }
        let cmd = ELM327.initSequence[initIndex]
        addLog("INIT: \(cmd)")
        send(cmd)
        // Init commands get a reply via notification; advance happens in handleResponse
    }

    private func startPolling() {
        if let profile = activeProfile, let p = peripheral {
            state = .connected(profileName: profile.name, deviceName: p.name ?? "OBD Adapter")
        }
        pollTimer = Timer.scheduledTimer(withTimeInterval: pollInterval, repeats: true) { [weak self] _ in
            self?.pollNextPID()
        }
    }

    private func pollNextPID() {
        let pids = ELM327.PID.allCases
        send(pids[pidIndex % pids.count].rawValue)
        pidIndex += 1
    }

    private func handleResponse(_ response: String) {
        if initIndex < ELM327.initSequence.count {
            initIndex += 1
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.sendNextInit()
            }
            return
        }
        if let partial = ELM327.parse(response) {
            merge(partial)
        }
    }

    private func merge(_ partial: Telemetry) {
        if partial.rpm      > 0  { telemetry.rpm      = partial.rpm }
        if partial.speed    >= 0 { telemetry.speed    = partial.speed }
        if partial.coolant  != 0 { telemetry.coolant  = partial.coolant }
        if partial.throttle > 0  { telemetry.throttle = partial.throttle }
        if partial.load     > 0  { telemetry.load     = partial.load }
        if partial.voltage  > 0  { telemetry.voltage  = partial.voltage }

        let point = HistoryPoint(date: Date(), rpm: telemetry.rpm, speed: telemetry.speed, load: telemetry.load)
        history.append(point)
        if history.count > maxHistory { history.removeFirst() }
    }
}

// MARK: - CBCentralManagerDelegate

extension OBDBLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:  addLog("BLE: Powered on — ready")
        case .poweredOff: state = .error("Bluetooth is off"); addLog("ERR: Bluetooth off")
        default:          break
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any],
                        rssi RSSI: NSNumber) {
        central.stopScan()
        self.peripheral = peripheral
        peripheral.delegate = self
        state = .connecting
        addLog("LINK: Found \(peripheral.name ?? "unknown") — connecting…")
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        addLog("LINK: Connected — discovering services…")
        peripheral.discoverServices(AdapterProfile.serviceUUIDs)
    }

    func centralManager(_ central: CBCentralManager,
                        didFailToConnect peripheral: CBPeripheral,
                        error: Error?) {
        state = .error(error?.localizedDescription ?? "Failed to connect")
        addLog("ERR: Failed to connect — \(error?.localizedDescription ?? "")")
        reset()
    }

    func centralManager(_ central: CBCentralManager,
                        didDisconnectPeripheral peripheral: CBPeripheral,
                        error: Error?) {
        pollTimer?.invalidate()
        pollTimer = nil
        if let error {
            state = .error(error.localizedDescription)
            addLog("ERR: Disconnected — \(error.localizedDescription)")
        } else {
            state = .idle
            addLog("LINK: Disconnected cleanly")
        }
        reset()
    }
}

// MARK: - CBPeripheralDelegate

extension OBDBLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil, let services = peripheral.services else {
            state = .error("Service discovery failed")
            return
        }
        for service in services {
            if let profile = AdapterProfile.all.first(where: { $0.serviceUUID == service.uuid }) {
                activeProfile = profile
                addLog("PROF: Matched \(profile.name)")
                peripheral.discoverCharacteristics([profile.writeUUID, profile.notifyUUID], for: service)
                return
            }
        }
        state = .error("No compatible BLE serial profile found")
        addLog("ERR: No compatible profile in discovered services")
    }

    func peripheral(_ peripheral: CBPeripheral,
                    didDiscoverCharacteristicsFor service: CBService,
                    error: Error?) {
        guard error == nil, let chars = service.characteristics, let profile = activeProfile else { return }

        for char in chars {
            if char.uuid == profile.notifyUUID {
                notifyChar = char
                peripheral.setNotifyValue(true, for: char)
            }
            if char.uuid == profile.writeUUID {
                writeChar = char
            }
        }
        // Fallback: some FFE0 adapters expose only FFE1 (notify + write)
        if writeChar == nil, let notify = notifyChar {
            writeChar = notify
            addLog("PROF: Using notify char for write (single-char adapter)")
        }

        guard writeChar != nil, notifyChar != nil else {
            state = .error("Required characteristics not found")
            addLog("ERR: Write/notify characteristics missing")
            return
        }
        startInit()
    }

    func peripheral(_ peripheral: CBPeripheral,
                    didUpdateValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        guard error == nil,
              let data = characteristic.value,
              let chunk = String(data: data, encoding: .utf8) else { return }

        responseBuffer += chunk
        guard responseBuffer.contains(">") else { return }

        let response = responseBuffer
            .replacingOccurrences(of: ">", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        responseBuffer = ""
        if !response.isEmpty { handleResponse(response) }
    }
}
