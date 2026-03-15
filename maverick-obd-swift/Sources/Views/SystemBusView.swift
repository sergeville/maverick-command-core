import SwiftUI

struct SystemBusView: View {
    let log: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("SYSTEM BUS", systemImage: "terminal")
                .font(.system(.caption, design: .monospaced).weight(.semibold))
                .foregroundStyle(.cyan)
                .tracking(2)

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 3) {
                        ForEach(Array(log.enumerated()), id: \.offset) { index, entry in
                            Text(entry)
                                .font(.system(.caption2, design: .monospaced))
                                .foregroundStyle(color(for: entry))
                                .id(index)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(height: 110)
                .onChange(of: log.count) { _, _ in
                    withAnimation { proxy.scrollTo(log.count - 1) }
                }
            }
        }
        .padding(16)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08)))
    }

    private func color(for entry: String) -> Color {
        if entry.contains("ERR:") { return .red.opacity(0.85) }
        if entry.contains("LINK:") { return .cyan.opacity(0.85) }
        if entry.contains("INIT:") { return .yellow.opacity(0.8) }
        if entry.contains("PROF:") { return .green.opacity(0.8) }
        return .white.opacity(0.4)
    }
}
