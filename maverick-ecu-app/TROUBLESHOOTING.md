# Maverick Command Core: Link Troubleshooting Guide

This document outlines the technical requirements and known hurdles for establishing a stable data link between the Maverick Command Core dashboard and the V-LINK (ELM327) hardware.

## 1. The "Handshake" vs. "Pairing"
**Paired (Browser Level):** The OS has established a physical radio link with the IOS-Vlink hardware. This does NOT mean data is flowing.
**Online (App Level):** The app has successfully discovered the "Data Pipe" (Service/Characteristic) and the hardware has responded to the initial `AT` command handshake.

## 2. The 3 Core Connection Hurdles

### 📁 A. Folder Mismatch (UUIDs)
Bluetooth devices organize features into "Services" (folders).
- **Standard Pipes:** Most adapters use `FFF0` or `FFE0`.
- **V-LINK Specific:** Many IOS-Vlink devices use the ISSC proprietary service `49535343-fe7d-4ae5-8fa9-9fafd205e455`.
- **Solution:** The app performs a "Deep Scan" to inventory all services if standard ones fail.

### ⚡ B. Silence on the Line
The ELM327 protocol requires a prompt-and-response rhythm.
- **The Prompt:** The hardware must send a `>` character to signal it is ready for the next command.
- **The Hang:** If the app sends `AT Z` and the hardware doesn't acknowledge, the app will timeout to prevent packet collisions.
- **Solution:** The app uses a 1-second "Warm-up" delay and a 3-second timeout listener.

### 🔒 C. Exclusive Access
OBD adapters are usually "monogamous"—they only talk to one app at a time.
- **The Conflict:** If Torque, OBD Fusion, or Car Scanner is running (even in the background) on a nearby phone, they may "lock" the hardware.
- **Solution:** Force-close all other automotive apps before clicking "Connect OBD."

## 3. Handshake Protocols (Case Sensitivity)
Some V-LINK firmware versions are "case-picky":
1. **Lowercase First:** The app attempts `at i`, `at z`, etc.
2. **Uppercase Retry:** If `ERR` or `TIMEOUT` is received, the app automatically retries in `AT I`, `AT Z`.
3. **Ignition State:** Ensure the Maverick's **Ignition is ON**. If the car is asleep, the adapter cannot communicate with the ECU and will return `ERR`.

## 4. Sequential Polling Engine
To maintain a stable link, the app uses **Sequential Polling**:
- Request RPM -> Wait for Response -> Pulse Heartbeat -> Request Speed -> Wait.
- This prevents the "Buffer Full" errors common in low-cost Bluetooth adapters.
