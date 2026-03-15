import SwiftUI
import Charts

struct TelemetryChartView: View {
    let history: [HistoryPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("LIVE TELEMETRY", systemImage: "waveform.path")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.cyan)
                .tracking(2)

            Chart {
                ForEach(history) { point in
                    AreaMark(
                        x: .value("Time", point.date),
                        y: .value("RPM", point.rpm / 100)
                    )
                    .foregroundStyle(.cyan.opacity(0.12))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("RPM", point.rpm / 100)
                    )
                    .foregroundStyle(.cyan)
                    .interpolationMethod(.catmullRom)
                    .lineStyle(StrokeStyle(lineWidth: 2))

                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Speed", point.speed)
                    )
                    .foregroundStyle(.blue.opacity(0.8))
                    .interpolationMethod(.catmullRom)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))

                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Load %", point.load)
                    )
                    .foregroundStyle(.orange.opacity(0.7))
                    .interpolationMethod(.catmullRom)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 2]))
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .frame(height: 100)

            HStack(spacing: 16) {
                legend(.cyan, "RPM ÷100")
                legend(.blue, "Speed")
                legend(.orange, "Load %")
            }
        }
        .padding(16)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08)))
    }

    private func legend(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(label)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.white.opacity(0.4))
        }
    }
}
