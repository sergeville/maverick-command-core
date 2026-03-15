# ChatGPT Work Summary

## What happened in the conversation
- Started with a futuristic OBD-II dashboard concept.
- Built an initial browser prototype using Web Bluetooth ideas.
- Upgraded the UI repeatedly for readability:
  - brighter text
  - lighter background
  - brighter graph line
  - brighter Drive Core section
  - brighter RPM / Load / Throttle cards
  - brighter Connection Blueprint section
- Converted the app concept to an iPhone-ready Capacitor architecture.
- Replaced browser BLE assumptions with native BLE through Capacitor.
- Added support assumptions for BLE adapter profiles:
  - V-LINK / FFFx
  - Nordic UART
- Created a detailed replication plan.
- Created a project structure handoff for building the real app.

## Current target
Build a production-ready iPhone app using Capacitor + BLE with a high-contrast futuristic dashboard and mock mode.

## Key technical decisions
- iPhone support should use native BLE, not browser Web Bluetooth.
- BLE dongles are required; Bluetooth Classic-only adapters are not the target.
- Keep UI and BLE service logic separated.
- Keep parser pure and testable.
- Maintain mock mode for development without hardware.
