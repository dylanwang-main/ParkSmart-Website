# ParkSmart - UCSD Parking Planner Prototype

A desktop-first web prototype for UCSD parking planning. This prototype uses sample data to explore parking options, walking times, and recommendation scoring.

> **Disclaimer**: This is a front-end only prototype using clearly labeled SAMPLE data. Nothing in it is a real prediction or live availability. It never claims guaranteed availability.

---

## Tech Stack

- **React 19** with **TypeScript**
- **Tailwind CSS v4** for clean, low-saturation glassmorphism UI
- **MapLibre GL JS** with two free, keyless basemaps and a Map / Satellite toggle:
  - **Satellite (default):** USGS National Map imagery (public domain, cached to zoom 16)
  - **Map:** OpenFreeMap Positron vector tiles
- **Motion (`motion/react`)** for smooth, subtle card stagger transitions
- No backend, no routing, no external authentication required

---

## Architecture & Layout

- **Full-Screen Map Canvas**: Satellite imagery by default, with a Map / Satellite toggle in the top right. Automatically fits bounds to all lots and active destination with panel offset padding (left: 404px, edges: ~60px).
- **Floating Glass Panel (`380px` wide)**: Positioned on the left with Apple Maps style frosted glass (`bg-white/45`, `backdrop-blur-2xl`, boosted saturation), a neutral palette, and color reserved for availability.
- **Corner State Simulator**: A dedicated developer switcher in the bottom-right corner to test all 4 required UI states (`Normal`, `Loading`, `Empty`, `Error`).

---

## What Is Real vs Sample

| Data | Status | Source |
|---|---|---|
| Parking structure names and pin locations | **Real** (verified 2026-10-21) | UCSD campus GIS, Building Points Public layer |
| Destination names and locations (141 buildings, searchable) | **Real** (verified 2026-10-21) | Same UCSD GIS layer, filtered to places people visit (`src/data/destinations.ts`) |
| Availability %, stall categories per structure, rankings | **Sample** | Placeholders until the QPASS pipeline and permit rules connect |

Lot data lives in `src/data/parkingLots.ts`. Pins mark each structure's building point, not its vehicle entrance. Mapping each structure to its official P-number (e.g. P701) is still an open question for the backend team.

---

## Permit Hours (time-aware eligibility)

`src/utils/permitRules.ts` encodes when each permit may use each stall category, from the team's **UCSD Parking Domain Research v1.2** (section 2). Example: an S permit can use S and D stalls 24/7, and A/B stalls weekdays 4 PM to 8 AM plus all weekend. Recommendations only include structures the permit can use **at the arrival time**, and cards show "Open 24/7" or "Valid until ...".

Not modeled yet (open questions in the research doc): A 24/7, reserved, accessible and SuperSaver stalls; lot-specific rules (P386, P701, SIO); holiday category rules; the Sept 2026 D restriction's effect on other permits; ParkMobile vs pay-station V; checking the whole stay rather than just arrival. Which stall categories each structure has (`spaceCategories`) is still **sample** data.

---

## Scoring Formula

Scoring is handled by `calculateParkingScore` in `src/data/sampleRecommendations.ts`:
- **65% Expected Availability**: Prioritizes lots with higher available capacity.
- **35% Walking Convenience**: Normalizes campus pedestrian walk times where shorter walks score higher.

---

## Local Development & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:3000` (or the URL provided by Vite).

### 3. Build for Production

```bash
npm run build
```

### 4. Run Tests and Type Checks

```bash
npm test        # Vitest: scoring formula and permit filtering
npm run lint    # TypeScript type check
```

Tests live next to the code they cover (`src/data/sampleRecommendations.test.ts`). Run both before opening a PR.

---

## Swapping in Real API Data

To connect real live parking sensor data and prediction models:

1. **API Contracts (`src/types.ts`)**:
   - `ParkingPlannerRequest`: destination, arrival date, arrival time, and permit type.
   - `ParkingPlannerResponse`: array of `ParkingRecommendation` objects.

2. **Replace Sample Service (`src/data/sampleRecommendations.ts`)**:
   - Replace the implementation of `getSampleRecommendations(request: ParkingPlannerRequest)`:
   ```typescript
   export async function getLiveRecommendations(
     request: ParkingPlannerRequest
   ): Promise<ParkingPlannerResponse> {
     const response = await fetch('/api/parking/recommendations', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(request),
     });
     if (!response.ok) {
       throw new Error('Failed to fetch parking predictions');
     }
     return response.json();
   }
   ```

3. **Update State in `src/App.tsx`**:
   - In `runPlanner()`, call `await getLiveRecommendations(formInputs)` inside a `try/catch` block. On catch, set `isError(true)`.

---

## Accessibility & Motion

- All cards and markers support keyboard navigation (`Tab`, `Enter`, `Space`).
- Accessible semantic HTML with proper labels and ARIA attributes (`role="radiogroup"`, `role="listbox"`, `aria-pressed`, `aria-label`).
- Respects `prefers-reduced-motion` for map transitions and card entrance animations.
