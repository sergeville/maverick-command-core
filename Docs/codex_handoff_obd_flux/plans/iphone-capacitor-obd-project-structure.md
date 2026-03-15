# iPhone-Ready Capacitor OBD-II App Structure

## Suggested stack
- Next.js or Vite React frontend
- Capacitor for native iPhone shell
- `@capacitor-community/bluetooth-le` for BLE
- Tailwind + shadcn/ui for the futuristic dashboard

## Folder structure

```text
obd-flux-ios/
├── package.json
├── capacitor.config.ts
├── tsconfig.json
├── next.config.mjs
├── postcss.config.js
├── tailwind.config.ts
├── public/
│   └── icons/
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

## Required iOS Info.plist additions

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>OBD Flux Console uses Bluetooth to connect to your vehicle OBD-II adapter for live diagnostics and telemetry.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>OBD Flux Console uses Bluetooth to read live engine data from your OBD-II BLE adapter.</string>
```
