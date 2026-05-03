# Traffic Simulation 🚦

A full-stack Vehicle-to-Infrastructure (V2I) Next.js application that simulates an automated intersection. It detects red-light runners, pairs drivers with vehicles dynamically, issues real-time challans (fines), and applies a legally compliant 3-Cycle Penalty Escalation Matrix to repeat offenders.

## ✨ Core Features

*   **Live V2I Simulation (`/simulation`):** A 60FPS HTML5 Canvas simulation. Vehicles randomly pair with drivers. If a driver or vehicle has an unpaid challan, an Immobilizer prevents them from crossing the intersection.
*   **Penalty Escalation Engine (`/api/violations`):** A backend algorithm that tracks offenses. It scales penalties from standard fines up to massive fines and automatically changes license statuses to `LAPSED`.
*   **Critical Police Dispatch Override:** If a driver with a `LAPSED` license attempts to drive, the system blocks the standard ticketing process and triggers an emergency dispatch alert.
*   **Unified Admin Dashboards (`/users` & `/vehicles`):** Manage drivers and vehicles. Includes search filters, status filters, creation modals, and the ability to pay individual or bulk challans.

## 🛠 Tech Stack

*   **Framework:** Next.js (App Router)
*   **Styling:** Tailwind CSS
*   **Database:** Supabase (PostgreSQL)
*   **Database Client:** `@supabase/supabase-js`

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
First, initialize your Next.js project and install the required Supabase client.

```bash
npx create-next-app@latest traffic-simulation
cd v2i-simulation
npm install @supabase/supabase-js
```

(Accept the default Next.js prompts: TypeScript, ESLint, Tailwind CSS, App Router)

### 2. Set Up Supabase Database

Create a free project at Supabase.
Navigate to the SQL Editor in your Supabase dashboard and run the following exact schema to create your relational tables:

```SQL
-- 1. Create Users Table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'ACTIVE'
);

-- 2. Create Vehicles Table
CREATE TABLE vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plate_number TEXT UNIQUE NOT NULL
);

-- 3. Create Challans Table (Links User and Vehicle)
CREATE TABLE challans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  zone TEXT NOT NULL,
  fine_amount DECIMAL DEFAULT 500.00,
  status TEXT DEFAULT 'UNPAID',
  offense_number INTEGER DEFAULT 1,
  penalty_details TEXT DEFAULT 'Fine'
);
```

### 3. Environment Variables

Go to Project Settings -> API in Supabase. Copy your Project URL and publishable public key. Create a .env.local file in the root of your Next.js project:

Code snippet
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```

### 4. Run the Application

Start the Next.js development server:

```Bash
npm run dev
```
Open http://localhost:3000 in your browser.

---

## 📁 Project Directory Structure
Ensure your files match this exact structure for the routing to work properly:

```
v2i-simulation/
├── .env.local                  # Supabase Environment Variables
├── lib/
│   └── supabase.ts             # Supabase Client Initialization
├── app/
│   ├── layout.tsx              # Global Layout (Default Next.js)
│   ├── page.tsx                # Welcome Dashboard (Navigation Hub)
│   ├── simulation/
│   │   └── page.tsx            # Live Canvas Intersection Simulation
│   ├── users/
│   │   └── page.tsx            # Driver Database, Creation Modal, Pay UI
│   ├── vehicles/
│   │   └── page.tsx            # Vehicle Database, Creation Modal, Pay UI
│   └── api/
│       ├── users/
│       │   └── route.ts        # POST: Register new drivers
│       ├── vehicles/
│       │   └── route.ts        # POST: Register new vehicles
│       └── violations/
│           └── route.ts        # POST: The 7-Step Escalation Matrix Engine
```

---

## 🧠 The 7-Step Penalty Escalation Algorithm
The core logic lives in app/api/violations/route.ts. When a vehicle jumps a red light, the system executes this sequence:

1. **Receive & Authenticate:** Reads plateNumber and driverName from the simulation.

2. **Critical Check**: If the driver's status is LAPSED, block the fine and return a CRITICAL_ARREST police alert.

3. **History Retrieval**: Counts all previous offenses for this specific user.

4. **Escalation Matrix**:

    * **Cycle 1 (Offenses 1-2)**: Fine (₹500)

    * **Cycle 1 (Offense 3)**: Fine + Mandatory Training (₹1500)

    * **Cycle 2 (Offenses 4-5)**: Fine (₹2500)

    * **Cycle 2 (Offense 6)**: Extra Fine (₹5000)

    * **Cycle 3 (Offenses 7-8)**: Terminal Fine (₹7500)

    * **Cycle 3 (Offense 9+)**: Extra Fine + Imprisonment (₹25000)

5. **Database Logging**: Inserts the challan linking the vehicle and user.

6. **Status Update**: If it is the 9th offense, updates the user's master record to LAPSED.

7. **Penalty Execution**: Returns the exact fine and penalty details to the simulation log.

---

## 🤝 Simulation Usage Guide
1. Go to the Driver Database and Vehicle Database to clear out any old data or manually register test entities.

2. Open the Live Simulation.

3. Ensure the light is RED.

4. Click Spawn Random Vehicle.

5. Watch the backend server logs update in real-time as the vehicle crosses the Trap Zone (Zone B).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
