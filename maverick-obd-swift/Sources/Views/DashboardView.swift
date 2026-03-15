import SwiftUI

struct DashboardView: View {
    @ObservedObject var manager: OBDBLEManager
    @State private var showConnection = false

    private let steps = [
        "BLE OBD-II dongle required (V-LINK / ELM327 BLE)",
        "Close any other OBD app (Torque, OBD Fusion)",
        "Ensure iPhone Bluetooth is enabled",
        "FFEx / Nordic UART / ISSC profiles auto-detected",
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    header
                    speedHero
                    TelemetryChartView(history: manager.history)
                    metricGrid
                    DiagnosticsView(manager: manager)
                    blueprintSection
                    SystemBusView(log: manager.log)
                }
                .padding()
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showConnection) {
            ConnectionView(manager: manager, isPresented: $showConnection)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("OBD FLUX CONSOLE")
                    .font(.system(.caption, design: .monospaced).weight(.black))
                    .foregroundStyle(.cyan)
                    .tracking(3)
                Text("Ford Maverick · CoreBluetooth")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.35))
            }
            Spacer()
            statusBadge
        }
    }

    private var statusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(manager.state.isConnected ? .green : .red)
                .frame(width: 8, height: 8)
            Text(manager.state.isConnected ? "LIVE" : "OFFLINE")
                .font(.system(.caption2, design: .monospaced).weight(.bold))
                .foregroundStyle(manager.state.isConnected ? .green : .red)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.white.opacity(0.05))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.1)))
    }

    // MARK: - Speed Hero

    private var speedHero: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(.white.opacity(0.04))
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.08)))

            HStack(alignment: .lastTextBaseline, spacing: 0) {
                Text(String(format: "%.0f", manager.telemetry.speed))
                    .font(.system(size: 96, weight: .black, design: .monospaced))
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())
                    .animation(.spring(response: 0.3), value: manager.telemetry.speed)

                Text(" km/h")
                    .font(.system(.title2, design: .monospaced).weight(.medium))
                    .foregroundStyle(.white.opacity(0.35))
                    .padding(.bottom, 8)

                Spacer()

                VStack(alignment: .trailing, spacing: 10) {
                    subMetric("RPM",      String(format: "%.0f",  manager.telemetry.rpm),      .cyan)
                    subMetric("LOAD",     String(format: "%.0f%%", manager.telemetry.load),    .orange)
                    subMetric("THROTTLE", String(format: "%.0f%%", manager.telemetry.throttle),.yellow)
                }
            }
            .padding(24)
        }
        .frame(height: 160)
    }

    private func subMetric(_ label: String, _ value: String, _ color: Color) -> some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(label)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.white.opacity(0.3))
                .tracking(2)
            Text(value)
                .font(.system(.title3, design: .monospaced).weight(.black))
                .foregroundStyle(color)
                .contentTransition(.numericText())
                .animation(.spring(response: 0.3), value: value)
        }
    }

    // MARK: - Metric Grid

    private var metricGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            MetricCard(label: "RPM",      value: String(format: "%.0f",  manager.telemetry.rpm),      unit: "rev/min", accent: .cyan)
            MetricCard(label: "SPEED",    value: String(format: "%.0f",  manager.telemetry.speed),    unit: "km/h",    accent: .blue)
            MetricCard(label: "LOAD",     value: String(format: "%.0f",  manager.telemetry.load),     unit: "%",       accent: .orange)
            MetricCard(label: "THROTTLE", value: String(format: "%.0f",  manager.telemetry.throttle), unit: "%",       accent: .yellow)
            MetricCard(label: "COOLANT",  value: String(format: "%.1f",  manager.telemetry.coolant),  unit: "°C",      accent: .green)
            MetricCard(label: "VOLTAGE",  value: String(format: "%.2f",  manager.telemetry.voltage),  unit: "V",       accent: .purple)
        }
    }

    // MARK: - Blueprint

    private var blueprintSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("CONNECTION BLUEPRINT", systemImage: "antenna.radiowaves.left.and.right")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.cyan)
                .tracking(2)

            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: 10) {
                    Text(String(format: "%02d", index + 1))
                        .font(.system(.caption2, design: .monospaced).weight(.bold))
                        .foregroundStyle(.cyan.opacity(0.5))
                    Text(step)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.5))
                }
            }

            if case .error(let msg) = manager.state {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(msg)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.red)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.red.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Button { showConnection = true } label: {
                HStack {
                    Image(systemName: "bolt.fill")
                    Text(manager.state.isConnected ? "CONNECTED — MANAGE" : "CONNECT OBD-II")
                        .font(.system(.caption, design: .monospaced).weight(.bold))
                        .tracking(2)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(manager.state.isConnected ? .green.opacity(0.15) : .cyan.opacity(0.12))
                .foregroundStyle(manager.state.isConnected ? .green : .cyan)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(manager.state.isConnected ? .green.opacity(0.3) : .cyan.opacity(0.25))
                )
            }
        }
        .padding(16)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08)))
    }
}
