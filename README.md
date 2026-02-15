# Maverick Command Core: Ford Maverick Diagnostic Dashboard

A high-fidelity, high-contrast automotive diagnostic suite for the Ford Maverick. Built with Next.js 15, Tailwind CSS, and Web Bluetooth LE API.

## 🚀 Overview
The **Maverick Command Core** is a "Control Plane" for vehicle telemetry, capable of:
- **Live OBD-II Streaming:** Real-time polling of RPM, Speed, and Engine Load via Bluetooth LE (V-LINK/ELM327).
- **Ford ECU Analytics:** Parsing manufacturer-specific ECU dumps to map internal vehicle modules.
- **Performance Lab:** Automatic 0-100 km/h timer and instant fuel efficiency (L/100km) tracking.
- **Tactical HUD:** A dedicated "Heads-Up Display" mode optimized for night driving and windshield reflection.
- **Telemetry Plotting:** Time-series visualization of sensor data trends.

## 🎨 Design Language
The project follows a **Tactical Diagnostic (Cyberpunk)** aesthetic:
- **Void Black:** Background optimized for OLED and night visibility.
- **Core Amber:** Primary accent for hardware interaction and alerts.
- **Glassmorphism:** Layered cockpit panels with backdrop-blur effects.
- **Monospace Data:** Precision readouts using Geist Mono.

## 🛠️ Technical Resources
- [Supported OBD-II Parameters (PIDs)](https://www.obdautodoctor.com/help/articles/supported-obd-parameters/) - Mode 01 Reference.
- [ELM327 AT Commands](https://www.elmelectronics.com/wp-content/uploads/2016/07/ELM327DS.pdf) - Hardware communication protocols.

## 📂 Project Structure
- `maverick-ecu-app/`: The core Next.js application.
- `Sensors.csv`: Sample telemetry logs for offline testing.
- `ecu_scan_data.md`: Raw Ford Maverick module dumps for development.
- `DESIGN_SPEC.md`: Detailed documentation of the visual system.

## 🏁 Getting Started
```bash
cd maverick-ecu-app
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to launch the dashboard.
