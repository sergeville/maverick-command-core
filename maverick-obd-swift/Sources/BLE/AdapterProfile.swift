import CoreBluetooth

struct AdapterProfile {
    let name: String
    let serviceUUID: CBUUID
    let writeUUID: CBUUID
    let notifyUUID: CBUUID
}

extension AdapterProfile {
    static let all: [AdapterProfile] = [
        AdapterProfile(
            name: "IOS-VLink / FFEx",
            serviceUUID: CBUUID(string: "FFE0"),
            writeUUID:   CBUUID(string: "FFE2"),
            notifyUUID:  CBUUID(string: "FFE1")
        ),
        AdapterProfile(
            name: "V-LINK / FFFx",
            serviceUUID: CBUUID(string: "FFF0"),
            writeUUID:   CBUUID(string: "FFF2"),
            notifyUUID:  CBUUID(string: "FFF1")
        ),
        AdapterProfile(
            name: "Nordic UART",
            serviceUUID: CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"),
            writeUUID:   CBUUID(string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"),
            notifyUUID:  CBUUID(string: "6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
        ),
        AdapterProfile(
            name: "ISSC / V-LINK BLE",
            serviceUUID: CBUUID(string: "49535343-FE7D-4AE5-8FA9-9FAFD205E455"),
            writeUUID:   CBUUID(string: "49535343-8841-43F4-A8D4-ECBE34729BB3"),
            notifyUUID:  CBUUID(string: "49535343-1E4D-4BD9-BA61-07C6435A7E56")
        ),
    ]

    static var serviceUUIDs: [CBUUID] { all.map(\.serviceUUID) }
}
