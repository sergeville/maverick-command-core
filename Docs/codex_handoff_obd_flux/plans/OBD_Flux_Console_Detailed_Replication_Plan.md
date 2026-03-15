# OBD Flux Console --- Detailed Replication Plan

## Goal

Build and ship an iPhone-ready OBD-II live telemetry app with: - a
modern futuristic dashboard - BLE connection to a compatible OBD-II
dongle - live streaming of standard OBD-II PIDs - mock mode for
design/testing without hardware - a codebase that can later support
diagnostics, trip logging, and coach-specific extensions

------------------------------------------------------------------------

## 1. Product scope

### Phase 1: core MVP

The first version should do these things reliably: - open on iPhone as a
Capacitor app - connect to a BLE OBD-II adapter - initialize the adapter
with ELM327 AT commands - poll standard Mode 01 PIDs - render live
values for: - speed - RPM - engine load - throttle - coolant
temperature - control module voltage - display a rolling graph -
disconnect cleanly - fall back to mock mode when no hardware is
connected

### Phase 2: quality and reliability

After the MVP works, improve: - reconnect handling - adapter detection -
buffering/parsing stability - app background/foreground behavior -
user-friendly errors - test coverage

### Phase 3: advanced features

After the platform is stable, add: - DTC read/clear - freeze frame
data - trip history - CSV export - high-visibility driving mode - Ford
or chassis-specific custom PIDs

------------------------------------------------------------------------

## 2. Technical architecture

### Frontend

Use React with your futuristic dashboard UI.

### Mobile wrapper

Use Capacitor so the React UI runs inside a native iPhone shell.

### BLE layer

Use `@capacitor-community/bluetooth-le` for native BLE access on iPhone.

### OBD communication model

Use ASCII command exchange with an ELM327-style BLE adapter. Examples: -
`ATZ` - `ATE0` - `010C` - `010D`

### Data flow

1.  user taps Connect
2.  app scans for BLE device
3.  app connects to GATT server
4.  app finds matching adapter profile
5.  app starts notifications
6.  app sends ELM327 init commands
7.  app begins PID polling loop
8.  notifications stream back hex frames
9.  parser converts frames to telemetry values
10. React state updates UI and graph

------------------------------------------------------------------------

## 3. Hardware requirements

### Required

-   iPhone for testing
-   BLE-compatible OBD-II adapter
-   vehicle with OBD-II port
-   Mac with Xcode installed for iOS build/testing

### Strong recommendation

Use a BLE adapter with stable GATT services. Avoid unknown cheap
adapters until the app is already working with a known good model.

### Important constraint

Bluetooth Classic-only OBD dongles are not the target for this iPhone
approach. The app should be designed around BLE adapters.

------------------------------------------------------------------------

## 4. Project structure to replicate

``` text
obd-flux-ios/
├── package.json
├── capacitor.config.ts
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── obd-dashboard.tsx
│   ├── lib/
│   │   ├── ble/
│   │   │   ├── adapterProfiles.ts
│   │   │   ├── obdBleClient.ts
│   │   │   └── parser.ts
│   │   └── utils.ts
│   └── types/
│       └── obd.ts
├── ios/
│   └── App/
│       └── App/
│           └── Info.plist
└── README.md
```

------------------------------------------------------------------------

## 10. Definition of done for MVP

The MVP is complete when all of these are true: - app runs on physical
iPhone - user can tap Connect - app connects to BLE OBD adapter - ELM327
init completes - live RPM and speed display correctly - engine load,
throttle, coolant, and voltage also update - graph updates
continuously - disconnect works cleanly - mock mode works without
hardware - no crash on malformed/partial response data

------------------------------------------------------------------------

## 12. Practical execution checklist

### Setup

-   [ ] create project
-   [ ] install dependencies
-   [ ] configure Tailwind and UI
-   [ ] add Capacitor
-   [ ] add iOS platform
-   [ ] add plist permissions

### Core code

-   [ ] create types
-   [ ] create adapter profiles
-   [ ] create parser
-   [ ] create BLE client
-   [ ] wire dashboard to BLE client
-   [ ] keep mock mode working
