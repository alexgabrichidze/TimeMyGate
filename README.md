# TimeMyGate

TimeMyGate is a small web app that answers the real pre-flight question:

> “Given my flight and how I travel, **when should I leave for the airport** so I’m safe, but not stuck at the gate for hours?”

This hackathon prototype focuses on **departures only** (home/work to airport gate). It uses **mocked but realistic times** for travel, check-in, security, and walking, plus simple “risk presets” to recommend a **“Leave at HH:MM”** time and show your full trip as a timeline.

All data is local and deterministic. There is **no live flight or traffic data** in this version.

## Features

- **Planner screen**
  - Choose a **sample flight** from ORD for today.
  - Pick where you’re leaving from (Home, Office, Hotel, etc.).
  - Select **travel mode** (car, taxi, rideshare, transit).
  - Toggle **checked bag** and **priority security**.
  - Pick a simple **risk preference** (cut it closer vs very safe).
  - Get a clear **recommended “Leave at HH:MM”** time.

- **Result screen with timeline**
  - Shows your full trip as a timeline:
    - Leave home  
    - Arrive at airport curb  
    - Finish check-in / bag drop  
    - Clear security  
    - Arrive at gate  
    - Boarding starts
  - Each step has:
    - A time
    - A short explanation
    - A visual status (upcoming / current / completed)

- **“I’m here now” and re-evaluation**
  - Mark your current step with **“I’m here now”** and watch previous steps complete.
  - A **“Running late or stuck?”** panel lets you re-evaluate from your current step and time.
  - The app keeps the **flight schedule fixed** and adjusts the remaining trip and buffer.

- **Demo-friendly behavior**
  - All times are **mocked and stable** (no external APIs).
  - Recalculation is designed to show how the flow works, without extreme “you definitely missed your flight” states.

## Tech Stack

- **Framework:** Next.js (App Router)  
- **UI:** React, shadcn/ui, Tailwind CSS  
- **Language:** TypeScript  
- **Animations:** Framer Motion  
- **Date/time helpers:** date-fns  
- **Data:** Local mocked TypeScript modules (no external APIs)  

## Project Structure

High-level structure (may vary slightly from the repo):

```text
app/
  page.tsx           # Planner (home) screen
  result/            # Result screen route
  select-flight/     # Flight selection route or modal

components/
  planner/           # Planner form + UI pieces
  result/            # Result view, timeline, “running late” panel
  timeline/          # Timeline component(s)
  ui/                # shadcn/ui components (generated)

data/
  flights.ts         # Sample ORD flights
  origins.ts         # Sample origins (Home, Office, etc.)
  timeProfiles.ts    # Mocked durations & risk presets

lib/
  recommendation.ts  # Functions to compute leave time + recommendation
  timeline.ts        # Helpers for building/rebuilding the trip timeline


This prototype uses only **mocked data**:

- **Flights:** A small set of realistic-looking ORD flights for “today.”  
- **Origins:** A few named origins with plausible Chicago addresses.  
- **Time profiles:** Simple constants for:
  - Travel times by mode  
  - Check-in / bag drop times  
  - Security times (standard vs priority)  
  - Walk to gate  
  - Risk presets mapped to rough buffer minutes  

The main logic is expressed as pure TypeScript functions that take a selected flight and simple trip options and return:

- A recommended leave time  
- Gate arrival and boarding times  
- A target vs actual buffer  
- A structured list of timeline steps for the UI  

For this hackathon version, the goal is **clarity and determinism**, not full realism.


## Limitations (Current Prototype)

- No live flight status, gate changes, or delays.  
- No live traffic or airport security data.  
- No user accounts, persistence, or storage of past trips.  
- Only departures from a small set of sample flights from ORD.  
- Risk levels and buffers are rule-based and simplified.  

These trade-offs are intentional to keep the demo **stable, predictable, and easy to reason about** during a hackathon.

---

## Future Directions

If extended beyond the hackathon, TimeMyGate could:

- Integrate **real flight and traffic APIs**.  
- Learn airport-specific patterns for security and check-in.  
- Use lightweight tracking and check-ins to improve estimates.  
- Support arrivals (gate to curb / home) and connections.  
- Offer a mobile-first experience with proactive “time to leave” notifications.  

For now, this repo focuses on a **clear, demo-friendly experience** that shows the shape of the product and the core planning logic.


