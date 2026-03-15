import Foundation

/// Lookup table of common OBD-II DTCs with descriptions and repair suggestions.
/// Focused on codes common to the Ford Maverick 2.0L EcoBoost / 2.5L Hybrid.
enum DTCDatabase {

    static func lookup(_ code: String) -> DTC {
        if let entry = table[code] {
            return DTC(code: code,
                       description: entry.0,
                       severity: entry.1,
                       repairs: entry.2)
        }
        return DTC(code: code,
                   description: "Unknown fault code",
                   severity: .medium,
                   repairs: ["Consult a Ford dealer or certified mechanic",
                             "Search '\(code)' in a Ford-specific forum"])
    }

    // (description, severity, [repair steps])
    private static let table: [String: (String, DTC.Severity, [String])] = [

        // ── Misfire ──────────────────────────────────────────────────────
        "P0300": ("Random / Multiple Cylinder Misfire", .high, [
            "Check and replace spark plugs (gap 0.028–0.031\")",
            "Inspect ignition coil packs — swap coils to identify failing unit",
            "Check fuel injectors for clogging or leak-down",
            "Inspect for vacuum leaks (intake manifold, PCV hose)",
            "Verify fuel pressure (min 45 psi at idle)"]),
        "P0301": ("Cylinder 1 Misfire", .high, [
            "Replace spark plug on cylinder 1",
            "Swap coil pack to another cylinder and re-scan to confirm",
            "Test fuel injector on cylinder 1"]),
        "P0302": ("Cylinder 2 Misfire", .high, [
            "Replace spark plug on cylinder 2",
            "Swap coil pack to another cylinder and re-scan to confirm",
            "Test fuel injector on cylinder 2"]),
        "P0303": ("Cylinder 3 Misfire", .high, [
            "Replace spark plug on cylinder 3",
            "Swap coil pack to another cylinder and re-scan to confirm",
            "Test fuel injector on cylinder 3"]),
        "P0304": ("Cylinder 4 Misfire", .high, [
            "Replace spark plug on cylinder 4",
            "Swap coil pack to another cylinder and re-scan to confirm",
            "Test fuel injector on cylinder 4"]),

        // ── Fuel / Air ───────────────────────────────────────────────────
        "P0171": ("System Too Lean — Bank 1", .medium, [
            "Inspect air filter — replace if dirty",
            "Check MAF sensor — clean with MAF cleaner spray",
            "Inspect PCV valve and hose for cracks",
            "Check for vacuum leaks around intake manifold",
            "Verify fuel pressure and injector function"]),
        "P0172": ("System Too Rich — Bank 1", .medium, [
            "Check for stuck-open fuel injector",
            "Inspect MAF sensor — clean or replace",
            "Check O2 sensor (upstream) for contamination",
            "Inspect for oil in intake (PCV issue)"]),
        "P0174": ("System Too Lean — Bank 2", .medium, [
            "Inspect air filter",
            "Check MAF sensor",
            "Inspect PCV system",
            "Check for vacuum leaks"]),

        // ── MAF / IAT ────────────────────────────────────────────────────
        "P0100": ("MAF Sensor Circuit Malfunction", .medium, [
            "Clean MAF sensor with MAF-safe cleaner",
            "Check MAF connector and wiring for damage",
            "Replace MAF sensor if cleaning doesn't resolve"]),
        "P0101": ("MAF Sensor Out of Range", .medium, [
            "Replace air filter (restricted airflow skews reading)",
            "Clean MAF sensor",
            "Inspect intake ducting for cracks or disconnection"]),
        "P0113": ("IAT Sensor High Input", .low, [
            "Check IAT sensor connector and wiring",
            "Replace IAT sensor (often integrated with MAF)",
            "Inspect air filter and intake for blockage"]),

        // ── O2 Sensors ───────────────────────────────────────────────────
        "P0130": ("O2 Sensor Slow Response — Bank 1 Sensor 1", .medium, [
            "Replace upstream O2 sensor (Bank 1)",
            "Check for exhaust leaks upstream of sensor"]),
        "P0136": ("O2 Sensor Circuit — Bank 1 Sensor 2", .medium, [
            "Replace downstream O2 sensor (Bank 1)",
            "Check wiring and connector for corrosion"]),
        "P0420": ("Catalyst Efficiency Below Threshold — Bank 1", .medium, [
            "Check for exhaust leaks near catalytic converter",
            "Replace upstream O2 sensor and re-test",
            "If fault persists, catalytic converter may need replacement",
            "Verify no coolant or oil burning (head gasket)"]),

        // ── Coolant / Thermostat ─────────────────────────────────────────
        "P0116": ("Coolant Temp Sensor Out of Range", .medium, [
            "Check ECT sensor connector and wiring",
            "Replace ECT sensor",
            "Verify coolant level and condition"]),
        "P0117": ("Coolant Temp Sensor Low Input", .medium, [
            "Inspect ECT sensor wiring for short to ground",
            "Replace ECT sensor"]),
        "P0128": ("Coolant Temp Below Thermostat Regulating Temperature", .low, [
            "Replace engine thermostat (most common cause)",
            "Verify coolant level is correct",
            "Check ECT sensor for accuracy"]),

        // ── Throttle / Pedal ─────────────────────────────────────────────
        "P0120": ("TPS Circuit Malfunction", .medium, [
            "Clean throttle body with throttle body cleaner",
            "Perform throttle body relearn procedure",
            "Inspect TPS wiring and connector",
            "Replace throttle body if fault persists"]),
        "P0122": ("TPS Circuit Low Input", .medium, [
            "Inspect TPS connector for corrosion or damage",
            "Check wiring for short to ground",
            "Replace throttle body / TPS"]),

        // ── EVAP / Fuel System ───────────────────────────────────────────
        "P0440": ("EVAP System Malfunction", .low, [
            "Check and tighten fuel cap (most common cause)",
            "Inspect EVAP hoses for cracks",
            "Check purge valve operation"]),
        "P0441": ("EVAP Purge Flow Incorrect", .low, [
            "Test EVAP purge solenoid (should click when powered)",
            "Inspect EVAP hoses and charcoal canister"]),
        "P0455": ("EVAP Large Leak Detected", .low, [
            "Tighten or replace fuel cap",
            "Inspect EVAP hose from charcoal canister to engine",
            "Use smoke test to locate leak"]),
        "P0456": ("EVAP Small Leak Detected", .low, [
            "Check fuel cap seal — replace cap if cracked",
            "Inspect EVAP system hoses and connections",
            "Perform smoke test on EVAP system"]),

        // ── EGR ──────────────────────────────────────────────────────────
        "P0401": ("EGR Flow Insufficient", .medium, [
            "Clean EGR valve passages with EGR cleaner",
            "Replace EGR valve if clogged or stuck",
            "Inspect EGR vacuum lines or solenoid"]),
        "P0402": ("EGR Flow Excessive", .medium, [
            "Replace EGR valve (stuck open)",
            "Check EGR solenoid for proper operation"]),

        // ── Oil Pressure / VVT ───────────────────────────────────────────
        "P0011": ("Camshaft Position A Over-Advanced — Bank 1", .high, [
            "Change engine oil and filter (low/dirty oil is #1 cause)",
            "Check oil level — top up if low",
            "Inspect VVT solenoid (phaser solenoid) — clean or replace",
            "Verify oil pressure is adequate"]),
        "P0012": ("Camshaft Position A Over-Retarded — Bank 1", .high, [
            "Change engine oil and filter",
            "Inspect VVT solenoid for sticking",
            "Check for sludge in oil passages"]),
        "P0016": ("Crankshaft/Camshaft Position Correlation — Bank 1", .high, [
            "Change engine oil immediately (sludge can delay cam timing)",
            "Inspect timing chain for stretch",
            "Replace timing chain tensioner if chain slack is excessive"]),

        // ── Battery / Charging ───────────────────────────────────────────
        "P0562": ("System Voltage Low", .medium, [
            "Test battery with load tester (should be 12.6V at rest)",
            "Inspect alternator output (13.5–14.5V at idle)",
            "Check battery terminals for corrosion — clean and tighten",
            "Replace battery if over 3–4 years old"]),
        "P0563": ("System Voltage High", .medium, [
            "Test alternator voltage regulator",
            "Inspect battery — failing battery can cause overcharge",
            "Replace alternator if voltage exceeds 15V"]),

        // ── Transmission ─────────────────────────────────────────────────
        "P0700": ("Transmission Control System Malfunction", .high, [
            "Scan for additional transmission-specific codes",
            "Check transmission fluid level and condition",
            "Inspect TCM wiring and connectors"]),
        "P0715": ("Input/Turbine Speed Sensor Circuit", .medium, [
            "Check transmission fluid level",
            "Inspect speed sensor connector and wiring",
            "Replace turbine speed sensor"]),

        // ── Ford Maverick specific ────────────────────────────────────────
        "P1450": ("Unable to Bleed Up Fuel Tank Vacuum", .low, [
            "Replace EVAP canister vent solenoid",
            "Check EVAP canister for saturation",
            "Inspect vent hose for blockage"]),
        "P0603": ("PCM Keep-Alive Memory Error", .medium, [
            "Check battery connections — clean and tighten",
            "Verify battery is holding charge",
            "If fault persists, PCM may require reprogramming at dealer"]),
    ]
}
