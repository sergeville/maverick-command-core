import SwiftUI

struct ConnectionView: View {
    @ObservedObject var manager: OBDBLEManager
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    Spacer()

                    Image(systemName: iconName)
                        .font(.system(size: 64))
                        .foregroundStyle(iconColor)
                        .symbolEffect(.pulse, isActive: manager.state == .scanning || manager.state == .connecting)

                    Text(manager.state.statusText)
                        .font(.system(.headline, design: .monospaced))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Handshake progress during init
                    if case .initializing = manager.state {
                        handshakeView
                    }

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

    private var iconName: String {
        switch manager.state {
        case .connected: return "bolt.fill"
        case .scanning, .connecting, .initializing: return "antenna.radiowaves.left.and.right"
        case .error: return "exclamationmark.triangle.fill"
        default: return "bolt.slash"
        }
    }

    private var iconColor: Color {
        switch manager.state {
        case .connected: return .green
        case .error: return .red
        case .scanning, .connecting, .initializing: return .cyan
        default: return .white.opacity(0.3)
        }
    }

    private var handshakeView: some View {
        VStack(spacing: 6) {
            Text("HANDSHAKE")
                .font(.system(size: 9, design: .monospaced).weight(.bold))
                .foregroundStyle(.white.opacity(0.3))
                .tracking(3)
                .padding(.bottom, 2)

            ForEach(Array(ELM327.initSequence.enumerated()), id: \.offset) { i, cmd in
                let acked = i < manager.initAcked.count && manager.initAcked[i]
                let active = i < manager.initAcked.count && !manager.initAcked[i]
                    && manager.initStep.contains(cmd)

                HStack(spacing: 8) {
                    Circle()
                        .fill(acked ? Color.green : (active ? Color.cyan : Color.white.opacity(0.15)))
                        .frame(width: 6, height: 6)
                    Text(cmd)
                        .font(.system(.caption2, design: .monospaced).weight(.semibold))
                        .foregroundStyle(acked ? .green : (active ? .cyan : .white.opacity(0.3)))
                    if active {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .scaleEffect(0.5)
                            .tint(.cyan)
                    }
                    Spacer()
                    if acked {
                        Text("OK")
                            .font(.system(size: 9, design: .monospaced).weight(.bold))
                            .foregroundStyle(.green.opacity(0.7))
                    }
                }
            }
        }
        .padding(14)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.08)))
        .padding(.horizontal)
    }

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
