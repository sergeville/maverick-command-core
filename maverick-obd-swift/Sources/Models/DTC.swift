import Foundation

struct DTC: Identifiable, Equatable {
    let id = UUID()
    let code: String          // e.g. "P0300"
    let description: String
    let severity: Severity
    let repairs: [String]

    enum Severity: String {
        case low    = "LOW"
        case medium = "MEDIUM"
        case high   = "HIGH"

        var color: String {
            switch self {
            case .low:    return "yellow"
            case .medium: return "orange"
            case .high:   return "red"
            }
        }
    }

    static func == (lhs: DTC, rhs: DTC) -> Bool { lhs.code == rhs.code }
}

// MARK: - DTC Parsing (Mode 03 response: 43 XX XX XX XX XX ...)

extension DTC {
    /// Parse a Mode 03 response string (e.g. "43 01 43 00 00 00 00") into DTC codes.
    static func parseMode03(_ raw: String) -> [String] {
        let line = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "")
            .uppercased()

        guard line.hasPrefix("43"), line.count >= 4 else { return [] }

        // Bytes after the 43 header
        let payload = String(line.dropFirst(2))
        var codes: [String] = []

        var i = payload.startIndex
        while payload.distance(from: i, to: payload.endIndex) >= 4 {
            let b1Str = String(payload[i..<payload.index(i, offsetBy: 2)])
            let b2Str = String(payload[payload.index(i, offsetBy: 2)..<payload.index(i, offsetBy: 4)])
            i = payload.index(i, offsetBy: 4)

            guard let b1 = UInt8(b1Str, radix: 16),
                  let b2 = UInt8(b2Str, radix: 16),
                  b1 != 0 || b2 != 0 else { continue }

            let prefix: String
            switch (b1 >> 6) & 0x03 {
            case 0: prefix = "P"
            case 1: prefix = "C"
            case 2: prefix = "B"
            default: prefix = "U"
            }

            let digits = String(format: "%01X%01X%02X",
                                (b1 >> 4) & 0x03,
                                b1 & 0x0F,
                                b2)
            codes.append("\(prefix)\(digits)")
        }
        return codes
    }
}
