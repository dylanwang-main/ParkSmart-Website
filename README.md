# ParkSmart - UCSD Parking Planner Prototype

A desktop-first web prototype for UCSD parking planning. This prototype uses sample data to explore parking options, walking times, and recommendation scoring.

> **Disclaimer**: This is a front-end only prototype using clearly labeled SAMPLE data. Nothing in it is a real prediction or live availability. It never claims guaranteed availability.

---

## Tech Stack

- **React 19** with **TypeScript**
- **Tailwind CSS v4** for clean, low-saturation glassmorphism UI
- **MapLibre GL JS** with free **OpenFreeMap Positron** vector tiles (no API key required)
- **Motion (`motion/react`)** for smooth, subtle card stagger transitions
- No backend, no routing, no external authentication required

---

## Architecture & Layout

- **Full-Screen Map Canvas**: Low-saturation, calm campus basemap styled via OpenFreeMap Positron vector tiles. Automatically fits bounds to all lots and active destination with panel offset padding (left: 404px, edges: ~60px).
- **Floating Glass Panel (`380px` wide)**: Positioned on the left with translucent white glass (`backdrop-blur-xl`), soft shadow, and high contrast typography.
- **Corner State Simulator**: A dedicated developer switcher in the bottom-right corner to test all 4 required UI states (`Normal`, `Loading`, `Empty`, `Error`).

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
