# FordMaverick Project

## Project Overview
This project is dedicated to the analysis and visualization of Ford Maverick ECU scan data. It consists of a raw data file and a Next.js web application intended to display this information.

- **Primary Goal:** Parse and visualize Ford Maverick OBD-II and ECU module data.
- **Core Technologies:**
  - **Next.js 16 (React 19):** Modern web framework for the frontend.
  - **Tailwind CSS 4:** For styling and visual presentation.
  - **TypeScript:** Ensuring type safety across the application.
- **Data Source:** `ecu_scan_data.md` contains comprehensive scan results including ECU protocols, VIN, timers, and detailed module information (ABS, BCM, BECM, etc.) for a Ford Maverick.

## Directory Structure
- `/ecu_scan_data.md`: The source data file containing raw ECU scan results.
- `/maverick-ecu-app`: The Next.js application directory.
- `/maverick-ecu-app/src/app`: Contains the App Router pages and layouts.

## Building and Running

### Prerequisites
- Node.js installed.
- npm or yarn.

### Development Commands
To work on the web application:
1. Navigate to the app directory:
   ```bash
   cd maverick-ecu-app
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Run linting:
   ```bash
   npm run lint
   ```

## Development Conventions
- **App Router:** The project uses Next.js App Router (`src/app`).
- **Styling:** Tailwind CSS 4 is used for styling.
- **Data Handling:** Future development should focus on parsing the Markdown data in `ecu_scan_data.md` to feed the React components.
- **Icons:** Standard Next.js boilerplate icons are located in `maverick-ecu-app/public`.
