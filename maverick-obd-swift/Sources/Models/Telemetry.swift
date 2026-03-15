import Foundation

struct Telemetry {
    var rpm: Double = 0
    var speed: Double = 0
    var coolant: Double = 0
    var throttle: Double = 0
    var load: Double = 0
    var voltage: Double = 0

    static let zero = Telemetry()
}

struct HistoryPoint: Identifiable {
    let id = UUID()
    let date: Date
    let rpm: Double
    let speed: Double
    let load: Double
}
