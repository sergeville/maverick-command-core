# OBD Flux Console — Codex Handoff

This package contains the minimum context and starter artifacts needed for Codex to replicate the work completed in ChatGPT.

## What this project is
An iPhone-ready OBD-II live telemetry app with:
- a futuristic dashboard UI
- Capacitor for iOS packaging
- BLE connection to compatible OBD-II dongles
- ELM327 initialization
- live Mode 01 PID streaming
- mock mode for testing without hardware

## Included files
- `CODEX_TASK.md` — the exact brief Codex should follow
- `dashboard/Maverick-obd-futuristic-dashboard.tsx` — latest dashboard/component state
- `plans/OBD_Flux_Console_Detailed_Replication_Plan.md` — detailed build plan
- `plans/iphone-capacitor-obd-project-structure.md` — target file/folder structure
- `conversation/CHATGPT_WORK_SUMMARY.md` — concise summary of what changed during the conversation

## Recommended Codex workflow
1. Start a new repo.
2. Copy these files into the repo.
3. Give Codex `CODEX_TASK.md` as the primary instruction.
4. Ask Codex to generate the full production file set:
   - `src/types/obd.ts`
   - `src/lib/ble/adapterProfiles.ts`
   - `src/lib/ble/parser.ts`
   - `src/lib/ble/obdBleClient.ts`
   - `src/components/obd-dashboard.tsx`
   - `src/app/page.tsx`
   - `capacitor.config.ts`
   - `package.json`
   - `ios/App/App/Info.plist` additions
5. Review BLE UUIDs against the actual dongle and adjust profiles as needed.

## Important constraints
- Target iPhone via Capacitor + native BLE, not Web Bluetooth for Safari.
- Use BLE dongles, not Bluetooth Classic-only adapters.
- Keep mock mode available at all times.
- Preserve the bright/high-contrast UI improvements from the conversation.

## Notes
Codex in ChatGPT can work across repos and tasks, and OpenAI’s docs describe it as a coding agent that can work in local tools or in the cloud. The Codex app, CLI, IDE integrations, and cloud tasks are all current official workflows. citeturn814400search1turn814400search3turn814400search15turn814400search21
