# maverick-ecu-app

Desktop ECU dashboard for the **Ford Maverick**. Connects to a BLE OBD-II adapter directly from Chrome via the Web Bluetooth API.

> Full project docs and screenshots → [root README](../README.md)

---

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** — high-contrast dark theme
- **Web Bluetooth API** — Chrome desktop only
- **TypeScript** + `@types/web-bluetooth`

---

## Start

```bash
npm install
PORT=3009 npm run dev
```

Open Chrome → `http://localhost:3009` → click **CONNECT OBD**.

> Requires Chrome on desktop (HTTPS or localhost). Firefox and Safari do not support Web Bluetooth.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Overview** | Link status, active module count, CAN protocol, engine pulse chart |
| **Gauges** | Live OBD PIDs — RPM, speed, coolant, intake air, throttle |
| **Telemetry** | Time-series trend charts |
| **DTCS** | Scan + clear stored fault codes |
| **Modules** | Ford ECU module map from raw scan dump |
| **History** | Archived snapshots |

**System Bus** panel — real-time BLE trace:
- `TX →` commands sent (cyan)
- `RX ←` responses received (green)
- `INIT` / `PROF` / `SCAN` messages (yellow)
- Errors (red)

Manual AT command input — type any ELM327 command directly.

---

## BLE / ELM327

**Adapter:** V-LINK IOS-Vlink (ELM327-compatible)

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

Service discovery: all services discovered upfront via `getPrimaryServices()`. Write/notify characteristics detected by property flags — not hardcoded UUIDs. Single-char adapter fallback included.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx               ← main dashboard (tabs, System Bus, gauges)
├── components/                ← UI components per tab
└── lib/
    ├── bluetooth-service.ts   ← BLE connect, ELM327 init, TX/RX
    └── obd-parser.ts          ← Mode 01 PID decoder
```
