# CODEX TASK — Replicate OBD Flux Console

You are rebuilding an iPhone-ready OBD-II telemetry app from prior design and planning work.

## Primary objective
Create a production-ready starter project for an app called **OBD Flux Console**.

## Product requirements
Build an app that:
- runs as an iPhone app using Capacitor
- uses native BLE via `@capacitor-community/bluetooth-le`
- connects to a BLE OBD-II adapter
- sends standard ELM327 AT initialization commands
- streams standard Mode 01 PIDs
- displays:
  - speed
  - RPM
  - engine load
  - throttle
  - coolant temperature
  - control module voltage
- includes a live telemetry graph
- includes mock mode for testing without hardware
- preserves the futuristic, high-contrast dashboard look

## Architecture requirements
Use this structure:
- `src/types/obd.ts`
- `src/lib/ble/adapterProfiles.ts`
- `src/lib/ble/parser.ts`
- `src/lib/ble/obdBleClient.ts`
- `src/components/obd-dashboard.tsx`
- `src/app/page.tsx`
- `capacitor.config.ts`
- `package.json`

## BLE requirements
- Do not use Web Bluetooth for production iPhone support.
- Use Capacitor native BLE.
- Support at least these initial adapter profile patterns:
  - FFFx service family
  - Nordic UART
- Keep adapter UUIDs easy to update.
- Buffer BLE notification chunks and split by carriage return.
- Parse malformed frames safely.

## Parser requirements
Support at least:
- `410C` RPM
- `410D` speed
- `4104` load
- `4105` coolant
- `4111` throttle
- `4142` control module voltage

## UI requirements
Preserve the visual direction from the supplied dashboard component:
- dark futuristic background
- bright readable text
- brighter graph line and axes
- Drive Core emphasis
- bright RPM / Load / Throttle cards
- bright Connection Blueprint card

## Deliverables
Generate:
1. complete file contents for the production starter project
2. brief setup instructions
3. any required `Info.plist` Bluetooth permission entries
4. notes on how to swap in the actual dongle UUIDs after testing

## Constraints
- TypeScript
- React
- Capacitor iOS
- clean separation of UI and BLE logic
- mock mode must remain available
- no unsupported assumptions about Bluetooth Classic on iPhone

Use the included files as the source of truth.
