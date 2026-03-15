import Foundation

enum ELM327 {
    static let initSequence = ["ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"]

    enum PID: String, CaseIterable {
        case rpm      = "010C"
        case speed    = "010D"
        case load     = "0104"
        case coolant  = "0105"
        case throttle = "0111"
        case voltage  = "0142"
    }

    /// Parse a single ELM327 response line into a partial Telemetry.
    /// Returns nil if the line is an error or unrecognised.
    static func parse(_ raw: String) -> Telemetry? {
        let line = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "")
            .uppercased()

        guard !line.contains("NODATA"),
              !line.contains("ERROR"),
              !line.contains("?"),
              line.count >= 6 else { return nil }

        var t = Telemetry()
        var matched = false

        if line.hasPrefix("410C"), line.count >= 8 {
            let a = hexByte(line, 4), b = hexByte(line, 6)
            t.rpm = Double(a * 256 + b) / 4.0
            matched = true
        } else if line.hasPrefix("410D"), line.count >= 6 {
            t.speed = Double(hexByte(line, 4))
            matched = true
        } else if line.hasPrefix("4104"), line.count >= 6 {
            t.load = Double(hexByte(line, 4)) * 100.0 / 255.0
            matched = true
        } else if line.hasPrefix("4105"), line.count >= 6 {
            t.coolant = Double(hexByte(line, 4)) - 40.0
            matched = true
        } else if line.hasPrefix("4111"), line.count >= 6 {
            t.throttle = Double(hexByte(line, 4)) * 100.0 / 255.0
            matched = true
        } else if line.hasPrefix("4142"), line.count >= 8 {
            let a = hexByte(line, 4), b = hexByte(line, 6)
            t.voltage = Double(a * 256 + b) / 1000.0
            matched = true
        }

        return matched ? t : nil
    }

    private static func hexByte(_ s: String, _ offset: Int) -> Int {
        let start = s.index(s.startIndex, offsetBy: offset)
        let end   = s.index(start, offsetBy: 2)
        return Int(s[start..<end], radix: 16) ?? 0
    }
}
