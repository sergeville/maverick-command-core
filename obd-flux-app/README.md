# obd-flux-app — OBD Flux Console

Ford Maverick — live OBD-II telemetry dashboard. Runs as a web preview on Chrome desktop and compiles to a native iPhone app via Capacitor.

> Full project docs and screenshots → [root README](../README.md)

---

## Stack

- **Next.js 15** (App Router, `output: 'export'` for Capacitor)
- **Tailwind CSS** — futuristic dark theme
- **Capacitor** — iOS native wrapper
- **`@capacitor-community/bluetooth-le`** — BLE on iPhone
- **Web Bluetooth API** — BLE on Chrome desktop

---

## Start (web preview)

```bash
npm install
PORT=3017 npm run dev
```

Open `http://localhost:3017`. Mock mode runs automatically on desktop when no adapter is connected.

---

## iPhone Build

```bash
npm run build        # static export → out/
npx cap sync         # copies out/ to iOS project
npx cap open ios     # opens Xcode
```

Select your iPhone → **⌘R**.

> BLE does not work in the iOS Simulator. Use a physical device.

---

## Features

- Live BLE telemetry — RPM, Speed, Engine Load, Coolant Temp, Throttle, Battery Voltage
- Rolling telemetry chart (Recharts AreaChart)
- Adapter auto-detection — IOS-VLink/FFEx, V-LINK/FFFx, Nordic UART, ISSC
- ELM327 init sequence + Mode 01 PID polling
- Mock mode for UI development without hardware
- **System Bus** log — color-coded TX/RX trace

---

## BLE / ELM327

**Adapter:** V-LINK IOS-Vlink (ELM327-compatible)

Supported BLE profiles:

| Service UUID (prefix) | Profile |
|-----------------------|---------|
| `0000ffe0` | IOS-VLink / FFEx |
| `0000fff0` | V-LINK / FFFx |
| `6e400001` | Nordic UART Service |
| `49535343` | ISSC / V-LINK BLE |

Init sequence:

```
ATZ     → Reset
ATE0    → Echo off
ATL0    → Linefeeds off
ATS0    → Spaces off
ATH0    → Headers off
ATCAF0  → CAN auto-format off  ← required for IOS-Vlink
ATSP0   → Auto protocol
```

Service discovery uses `getPrimaryServices()` upfront. Write/notify chars detected by property flags. Single-char adapter fallback (notify char used for write if no dedicated write char found). Response buffered until `>` prompt.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── obd-dashboard.tsx      ← main dashboard UI
├── lib/
│   ├── utils.ts
│   └── ble/
│       ├── adapterProfiles.ts ← BLE service UUIDs + ELM327 init
│       ├── obdBleClient.ts    ← BLE connect, char detection, TX/RX
│       └── parser.ts          ← ELM327 frame → PID value decoder
└── types/
    └── obd.ts                 ← Telemetry, AdapterProfile types
```
