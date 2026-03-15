# OBD Flux Console

Ford Maverick — iPhone-ready BLE OBD-II live telemetry dashboard.

Built with Next.js, Tailwind CSS, Capacitor (iOS), and `@capacitor-community/bluetooth-le`.

---

## Architecture

```
obd-flux-app/
├── capacitor.config.ts          ← Capacitor app config
├── src/
│   ├── app/                     ← Next.js App Router
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── obd-dashboard.tsx    ← Main futuristic dashboard
│   ├── lib/
│   │   ├── utils.ts             ← clamp, delay, formatTime, calcEfficiency
│   │   └── ble/
│   │       ├── adapterProfiles.ts   ← V-LINK/FFFx, Nordic UART, ISSC
│   │       ├── obdBleClient.ts      ← Web Bluetooth client (dev preview)
│   │       └── parser.ts            ← Pure ELM327 frame parser
│   └── types/
│       └── obd.ts               ← Telemetry, HistoryPoint, AdapterProfile
└── public/
```

## Dev (browser / mock mode)

```bash
cd obd-flux-app
node_modules/.bin/next dev --port 3017
```

Open http://localhost:3017. Runs in **Mock** mode automatically (simulated data).
Web Bluetooth works in Chrome desktop for quick testing.

> **Port:** Registered at 3017. Check `~/Documents/Documentation/System/PORT_REGISTRY.md`.

---

## iPhone Build (Capacitor)

### Prerequisites
- macOS with Xcode installed
- Node.js 18+
- `npx cap` CLI

### Step 1 — Build the static export

Add `output: 'export'` to `next.config.ts`, then:

```bash
npm run build
```

### Step 2 — Add iOS platform

```bash
npm install @capacitor/cli
npx cap add ios
npx cap sync
```

### Step 3 — Add Bluetooth permissions to Info.plist

In `ios/App/App/Info.plist`, add:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>OBD Flux Console uses Bluetooth to connect to your vehicle OBD-II adapter for live diagnostics.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>OBD Flux Console reads live engine data from your OBD-II BLE adapter.</string>
```

### Step 4 — Open in Xcode and run on device

```bash
npx cap open ios
```

Select your iPhone target, then Build & Run (⌘R).

---

## Adapter Support

| Profile | Service UUID | Notes |
|---------|-------------|-------|
| V-LINK / FFFx | `0000fff0-…` | Most common ELM327 BLE |
| Nordic UART | `6e400001-…` | Some OBDII BLE adapters |
| ISSC / V-LINK BLE | `49535343-…` | ISSC-chipset dongles |

BLE-only. Bluetooth Classic (SPP) adapters are not supported on iPhone.

---

## Data flow

1. User taps **Connect OBD-II** → browser/native BLE scan
2. App connects to GATT server
3. Profile auto-detected (FFFx → Nordic UART → ISSC)
4. ELM327 init sequence: `ATZ → ATE0 → ATL0 → ATS0 → ATH0 → ATSP0`
5. PID polling loop at 350ms/PID: RPM, Speed, Load, Coolant, Throttle, Voltage
6. Notifications → parser → React state → UI + graph

---

## Phase roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core MVP | ✅ Done | BLE connect, ELM327 init, 6 PIDs, graph, mock mode |
| 2 — Quality | 🔲 Next | Reconnect, better errors, test coverage |
| 3 — Advanced | 🔲 Later | DTC read/clear, trip history, CSV export, HUD mode |
