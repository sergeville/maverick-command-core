# Maverick Command Core: Design Specification

## 1. Visual Identity
**Theme Name:** Tactical Diagnostic (Cyberpunk Variant)
**User Persona:** Advanced Automotive Diagnostic / Performance Tuning
**Primary Goal:** High-visibility data monitoring in dark environments.

## 2. Design Tokens
### Colors
- **Background:** `#050505` (True Black)
- **Primary Accent:** `amber-500` (#f59e0b) - Used for critical data and UI headers.
- **Secondary Accent:** `zinc-900` / `amber-950` - Used for panel backgrounds.
- **Success:** `green-500` - Link Active / System Nominal.
- **Danger:** `red-600` - Disconnect / DTC Detected.
- **Telemetry Palette:** `['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7']`

### Typography
- **Headings:** All-caps, font-black, italic, extra tracking-tighter.
- **Data/Monitors:** Monospace (Geist Mono), bold.
- **Sub-labels:** Uppercase, text-[8px], tracking-widest, opacity-40.

## 3. Component Patterns
### Glass Panels
- `bg-zinc-900/30`
- `backdrop-blur-xl`
- `border border-amber-500/10`
- `rounded-3xl`

### Buttons (Tactical)
- **Live Link:** Solid Amber, Black text, glowing shadow.
- **Disconnect:** Solid Red, White text, red glowing shadow.
- **Secondary:** Transparent with Amber border and hover-fill.

## 4. Layout Architecture
- **Header:** Sticky top, brand left, navigation right.
- **Main:** Centered max-width 7XL, responsive grid (1 col mobile, 4 col desktop).
- **Diagnostic Bus:** Fixed height sidebar/bottom-right terminal for real-time serial logs.
- **Action Bar:** Floating bottom-center "pill" for core hardware interactions (Connect/Sync).

## 5. View States
- **Ford Mode:** High-level ECU module mapping.
- **CSV Mode:** Time-series telemetry plotting.
- **HUD Mode:** Ultra-high contrast, maximized typography for windshield reflection.
