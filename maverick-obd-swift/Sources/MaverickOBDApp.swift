import SwiftUI

@main
struct MaverickOBDApp: App {
    var body: some Scene {
        WindowGroup {
            DashboardView(manager: OBDBLEManager())
        }
    }
}
