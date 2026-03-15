import SwiftUI

struct DiagnosticsView: View {
    @ObservedObject var manager: OBDBLEManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            scanButton
            resultsSection
        }
        .padding(16)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08)))
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Label("DIAGNOSTICS", systemImage: "stethoscope")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.cyan)
                .tracking(2)
            Spacer()
            if case .done(let count) = manager.dtcScanState {
                Text("\(count) CODE\(count == 1 ? "" : "S")")
                    .font(.system(.caption2, design: .monospaced).weight(.bold))
                    .foregroundStyle(count == 0 ? .green : .red)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((count == 0 ? Color.green : Color.red).opacity(0.1))
                    .clipShape(Capsule())
            }
        }
    }

    // MARK: - Scan Button

    private var scanButton: some View {
        HStack(spacing: 10) {
            Button {
                manager.scanDTCs()
            } label: {
                HStack(spacing: 8) {
                    if case .scanning = manager.dtcScanState {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .scaleEffect(0.7)
                            .tint(.cyan)
                    } else {
                        Image(systemName: "magnifyingglass")
                    }
                    Text(scanButtonLabel)
                        .font(.system(.caption, design: .monospaced).weight(.bold))
                        .tracking(1)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(.cyan.opacity(0.12))
                .foregroundStyle(.cyan)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(.cyan.opacity(0.25)))
            }
            .disabled(!manager.state.isConnected || isScanningInProgress)

            if !manager.dtcs.isEmpty {
                Button {
                    manager.clearDTCs()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "trash")
                        Text("CLEAR")
                            .font(.system(.caption, design: .monospaced).weight(.bold))
                            .tracking(1)
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 14)
                    .background(.red.opacity(0.1))
                    .foregroundStyle(.red)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(.red.opacity(0.25)))
                }
            }
        }
    }

    private var scanButtonLabel: String {
        switch manager.dtcScanState {
        case .scanning: return "SCANNING…"
        case .done:     return "RESCAN"
        default:        return "SCAN FOR CODES"
        }
    }

    private var isScanningInProgress: Bool {
        if case .scanning = manager.dtcScanState { return true }
        return false
    }

    // MARK: - Results

    @ViewBuilder
    private var resultsSection: some View {
        if case .done(let count) = manager.dtcScanState, count == 0 {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Text("No fault codes stored")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.green)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.green.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else if case .error(let msg) = manager.dtcScanState {
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
        } else if !manager.dtcs.isEmpty {
            VStack(spacing: 8) {
                ForEach(manager.dtcs) { dtc in
                    DTCCardView(dtc: dtc)
                }
            }
        }
    }
}

// MARK: - DTC Card

struct DTCCardView: View {
    let dtc: DTC
    @State private var expanded = false

    private var accentColor: Color {
        switch dtc.severity {
        case .low:    return .yellow
        case .medium: return .orange
        case .high:   return .red
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            Button {
                withAnimation(.spring(response: 0.3)) { expanded.toggle() }
            } label: {
                HStack(spacing: 10) {
                    Text(dtc.code)
                        .font(.system(.caption, design: .monospaced).weight(.black))
                        .foregroundStyle(accentColor)
                        .frame(width: 52, alignment: .leading)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(dtc.description)
                            .font(.system(.caption, design: .monospaced).weight(.semibold))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.leading)
                        Text(dtc.severity.rawValue)
                            .font(.system(size: 9, design: .monospaced).weight(.bold))
                            .foregroundStyle(accentColor.opacity(0.7))
                            .tracking(1)
                    }

                    Spacer()

                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.4))
                }
                .padding(10)
            }
            .buttonStyle(.plain)

            // Expanded repair list
            if expanded {
                Divider().background(.white.opacity(0.08))

                VStack(alignment: .leading, spacing: 6) {
                    Text("RECOMMENDED REPAIRS")
                        .font(.system(size: 9, design: .monospaced).weight(.bold))
                        .foregroundStyle(.white.opacity(0.4))
                        .tracking(2)
                        .padding(.bottom, 2)

                    ForEach(Array(dtc.repairs.enumerated()), id: \.offset) { i, repair in
                        HStack(alignment: .top, spacing: 8) {
                            Text(String(format: "%02d", i + 1))
                                .font(.system(.caption2, design: .monospaced).weight(.bold))
                                .foregroundStyle(accentColor.opacity(0.6))
                                .frame(width: 20)
                            Text(repair)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(.white.opacity(0.75))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding(10)
            }
        }
        .background(accentColor.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(accentColor.opacity(0.2)))
    }
}
