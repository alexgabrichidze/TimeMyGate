# TimeMyGate

TimeMyGate is a small web app that answers the real pre-flight question:

> “Given my flight and how I travel, **when should I leave for the airport** so I’m safe, but not stuck at the gate for hours?”

This hackathon prototype focuses on **departures only** (home/work → airport gate). It uses **mocked but realistic times** for travel, check-in, security, and walking, plus simple “risk presets” to recommend a **“Leave at HH:MM”** time and show your full trip as a timeline.

All data is local and deterministic. There is **no live flight or traffic data** in this version.

---

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

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React, shadcn/ui, Tailwind CSS
- **Language:** TypeScript
- **Animations:** Framer Motion
- **Date/time helpers:** date-fns
- **Data:** Local mocked TypeScript modules (no external APIs)
- **AI assistance:** Codex guided via `AGENTS.md`

---

## Project Structure

High-level structure (may vary slightly from
