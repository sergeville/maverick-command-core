import SwiftUI

struct ConnectionView: View {
    @ObservedObject var manager: OBDBLEManager
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 12) {
                    Spacer()
                    workflowView
                        .padding(.horizontal)
                    traceView
                        .padding(.horizontal)
                    Spacer()
                    actionButton
                        .padding(.horizontal)
                        .padding(.bottom, 40)
                }
            }
            .navigationTitle("OBD Connection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { isPresented = false }
                        .foregroundStyle(.cyan)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Workflow Steps

    private enum StepStatus { case pending, active, done, failed }

    private var scanStatus: StepStatus {
        switch manager.state {
        case .idle:                          return .pending
        case .scanning:                      return .active
        case .error:                         return hasPassed(.scanning) ? .done : .failed
        default:                             return .done
        }
    }

    private var connectStatus: StepStatus {
        switch manager.state {
        case .idle, .scanning:               return .pending
        case .connecting:                    return .active
        case .error:                         return manager.discoveredDeviceName.isEmpty ? .pending : .failed
        default:                             return .done
        }
    }

    private var initStatus: StepStatus {
        switch manager.state {
        case .idle, .scanning, .connecting:  return .pending
        case .initializing:                  return .active
        case .error:                         return manager.initAcked.contains(true) ? .failed : .pending
        default:                             return .done
        }
    }

    private var liveStatus: StepStatus {
        switch manager.state {
        case .connected:                     return .done
        default:                             return .pending
        }
    }

    private func hasPassed(_ target: ConnectionState) -> Bool {
        // Used for error state disambiguation — not needed now but keeps logic clean
        !manager.discoveredDeviceName.isEmpty
    }

    // MARK: - Workflow View

    private var workflowView: some View {
        VStack(alignment: .leading, spacing: 0) {
            stepRow(
                number: 1,
                label: "BLE SCAN",
                sublabel: scanSublabel,
                status: scanStatus
            )
            connector(active: scanStatus == .done)

            stepRow(
                number: 2,
                label: "CONNECT",
                sublabel: connectSublabel,
                status: connectStatus
            )
            connector(active: connectStatus == .done)

            handshakeStepRow
            connector(active: initStatus == .done)

            stepRow(
                number: 4,
                label: "LIVE POLLING",
                sublabel: liveSublabel,
                status: liveStatus
            )
        }
        .padding(16)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08)))
    }

    private var scanSublabel: String {
        switch manager.state {
        case .scanning: return "Searching for OBD adapter…"
        case .idle:     return "Tap button to start"
        case .error(let msg) where msg.contains("No OBD"): return "No adapter found"
        default:        return "Adapter found"
        }
    }

    private var connectSublabel: String {
        if manager.discoveredDeviceName.isEmpty { return "Waiting…" }
        return manager.discoveredDeviceName
    }

    private var liveSublabel: String {
        if case .connected(let profile, _) = manager.state { return profile }
        return "Waiting for handshake…"
    }

    @ViewBuilder
    private func stepRow(number: Int, label: String, sublabel: String, status: StepStatus) -> some View {
        HStack(alignment: .top, spacing: 12) {
            stepIcon(status: status, number: number)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .foregroundStyle(status == .pending ? .white.opacity(0.3) : .white)
                    .tracking(2)
                Text(sublabel)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(sublabelColor(status))
            }
            Spacer()
            if status == .active {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(0.6)
                    .tint(.cyan)
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var handshakeStepRow: some View {
        HStack(alignment: .top, spacing: 12) {
            stepIcon(status: initStatus, number: 3)
            VStack(alignment: .leading, spacing: 2) {
                Text("HANDSHAKE")
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .foregroundStyle(initStatus == .pending ? .white.opacity(0.3) : .white)
                    .tracking(2)
                Text("ELM327 init sequence")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(sublabelColor(initStatus))
                if initStatus != .pending {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(Array(ELM327.initSequence.enumerated()), id: \.offset) { i, cmd in
                            let acked = i < manager.initAcked.count && manager.initAcked[i]
                            let active = i < manager.initAcked.count && !manager.initAcked[i]
                                && manager.initStep.contains(cmd)
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(acked ? Color.green : (active ? Color.cyan : Color.white.opacity(0.15)))
                                    .frame(width: 5, height: 5)
                                Text(cmd)
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundStyle(acked ? .green : (active ? .cyan : .white.opacity(0.3)))
                                if acked {
                                    Text("OK")
                                        .font(.system(size: 9, design: .monospaced).weight(.bold))
                                        .foregroundStyle(.green.opacity(0.6))
                                }
                                if active {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .scaleEffect(0.4)
                                        .tint(.cyan)
                                }
                                Spacer()
                            }
                        }
                    }
                    .padding(.top, 4)
                }
            }
            Spacer()
            if initStatus == .active {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(0.6)
                    .tint(.cyan)
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func stepIcon(status: StepStatus, number: Int) -> some View {
        ZStack {
            Circle()
                .fill(iconBg(status))
                .frame(width: 28, height: 28)
            switch status {
            case .done:
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.green)
            case .failed:
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.red)
            default:
                Text("\(number)")
                    .font(.system(size: 11, design: .monospaced).weight(.bold))
                    .foregroundStyle(status == .active ? .cyan : .white.opacity(0.3))
            }
        }
    }

    private func iconBg(_ status: StepStatus) -> Color {
        switch status {
        case .done:    return .green.opacity(0.15)
        case .active:  return .cyan.opacity(0.15)
        case .failed:  return .red.opacity(0.15)
        case .pending: return .white.opacity(0.06)
        }
    }

    private func sublabelColor(_ status: StepStatus) -> Color {
        switch status {
        case .done:    return .green.opacity(0.7)
        case .active:  return .cyan.opacity(0.8)
        case .failed:  return .red.opacity(0.8)
        case .pending: return .white.opacity(0.2)
        }
    }

    @ViewBuilder
    private func connector(active: Bool) -> some View {
        HStack {
            Rectangle()
                .fill(active ? Color.green.opacity(0.4) : Color.white.opacity(0.08))
                .frame(width: 1, height: 16)
                .padding(.leading, 13)
            Spacer()
        }
    }

    // MARK: - Trace / Log

    private var traceView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("TRACE")
                    .font(.system(size: 9, design: .monospaced).weight(.bold))
                    .foregroundStyle(.white.opacity(0.3))
                    .tracking(3)
                Spacer()
                Text("\(manager.log.count) events")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.2))
            }
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        ForEach(Array(manager.log.enumerated()), id: \.offset) { i, entry in
                            Text(entry)
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(traceColor(entry))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id(i)
                        }
                    }
                }
                .frame(height: 120)
                .onChange(of: manager.log.count) { _ in
                    if let last = manager.log.indices.last {
                        proxy.scrollTo(last, anchor: .bottom)
                    }
                }
            }
        }
        .padding(12)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.06)))
    }

    private func traceColor(_ entry: String) -> Color {
        if entry.contains("TX →")  { return .cyan.opacity(0.8) }
        if entry.contains("RX ←")  { return .green.opacity(0.8) }
        if entry.contains("ERR")   { return .red.opacity(0.9) }
        if entry.contains("SCAN")  { return .yellow.opacity(0.7) }
        return .white.opacity(0.4)
    }

    // MARK: - Action Button

    private var actionButton: some View {
        Button {
            if manager.state.isConnected {
                manager.disconnect()
            } else {
                manager.connect()
                isPresented = false
            }
        } label: {
            let isConnected = manager.state.isConnected
            Text(isConnected ? "DISCONNECT" : "SCAN FOR OBD ADAPTER")
                .font(.system(.callout, design: .monospaced).weight(.bold))
                .tracking(2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isConnected ? .red.opacity(0.15) : .cyan.opacity(0.15))
                .foregroundStyle(isConnected ? .red : .cyan)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isConnected ? .red.opacity(0.35) : .cyan.opacity(0.35))
                )
        }
    }
}
