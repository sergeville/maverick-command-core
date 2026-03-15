import SwiftUI

@main
struct MaverickOBDApp: App {
    @StateObject private var manager = OBDBLEManager()

    var body: some Scene {
        WindowGroup {
            DashboardView(manager: manager)
        }
    }
}
