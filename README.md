# Never Lost

A mobile-first web app that helps shoppers find products in physical stores. Build a list, pick a store, and follow an optimized route on a 2D floor plan. Includes a manager flow for building store floor plans.

**Demo:** [https://github.com/2Pepino/Never-Lost](https://github.com/2Pepino/Never-Lost)

---

## What it does

Never Lost connects two roles in one app:

| Role | Route | Purpose |
|------|-------|---------|
| **Customer** | `/` (login required) | Shopping list, store browse, floor plan navigation |
| **Manager** | `/manage` | Edit floor plans, view catalog, connect external APIs |

Product catalogs and floor plans are stored on a small **Node.js API** (JSON file database). Customer sessions, carts and profile edits still use the browser (`localStorage`).

---

## Customer experience

### Home — stores

Browse 5 stores around Ghent (simulated location: Korenmarkt), sorted by distance. Search by name, street or type.

### Cart

Your cart holds products you added from stores or search. Check items off as you shop, remove items, or add more via search. At the bottom, the app suggests which store can supply the most items from your list in one trip.

### In a store

Open a store to:

- Search and browse products by category (in-stock items first)
- Open the **floor plan**, tap to set your starting position, and get a walking route along your cart items
- Check off racks as you visit them — the route and your position update in real time
- After all product stops: route continues to **checkout** and then **exit**

### Product page

- Add/remove from cart
- See stock status: on shelf, in warehouse, or out of stock
- **Out of stock** → alternatives in the same category (sorted by price similarity) and the same product at other stores
- Route to the product on the floor plan when it is on shelf

### Profile

Under **More / Profile** you can edit personal details (name, email, phone, address) and choose a profile photo (presets or custom upload). Sign up creates your own account; a demo account is seeded on first load (see below).

---

## Floor plans & routing

Each store can use one of two floor plan modes:

1. **Demo layout** — auto-generated from product shelf locations (`InteractiveFloorplan`)
2. **Custom layout** — drawn by a manager in the floor plan editor, saved per store (`PlanFloorplan`)

Routing behaviour:

- Paths follow walkable corridors (A* on a grid for custom plans; aisle network for demo layouts)
- Shelves are approached from the **front** only (label bar = back)
- Multiple cart items → nearest-neighbour stop order from your start point
- Order: **product racks → checkout → exit**
- Visited racks are skipped; the blue dot moves to your current stop

Managers assign each shelf a **product category** label (e.g. pasta, bread) so routes match products in the catalog.

---

## Manager experience

Login at `/manage/login`.

| Page | What it does |
|------|----------------|
| **Home** | Links to floor plan editor, catalog and connections |
| **Floor plan editor** | Drag walls, fixed/temporary racks, checkout, entrance and exit onto the map. Resize, rotate, assign categories. Preview how customers see it. |
| **Catalog** | Live product list with stock for the manager's store |
| **Connections** | Configure external API endpoints to sync stock (demo/mock supported) |

Floor plans are saved via the API (`PUT /api/stores/:storeId/floorplan`). API connections for stock sync are stored in `localStorage` per store.

---

## Product ranking

`src/lib/personalization.js` sorts store search by in-stock first, then name. Out-of-stock alternatives use same category and similar price.

---

## Stores (seed data)

All demo stores are in **Ghent**:

| ID | Store |
|----|-------|
| `ah-xl` | AH XL Ghent |
| `mediamarkt` | MediaMarkt Ghent |
| `decathlon` | Decathlon Ghent |
| `hema` | HEMA Veldstraat |
| `delhaize` | Delhaize Sint-Pieters |

Product assortments differ per store (groceries, electronics, sport, toys, etc.).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite 6 |
| Backend | Express API + JSON file store (`server/`) |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| State | React Context + API for catalog/floor plans |
| Floor plan | SVG + custom A* pathfinding / aisle graph |
| Security | Client-side password hashing, login lockout (`src/lib/security.js`) |

Each store has **10 categories** (`cat1`–`cat10`) with **20 products** each (200 per store). Product IDs are **UUIDs**. Store **names** are fixed in `src/data/stores.js`.

---

## Getting started

### Requirements

- **Node.js 20+** with npm

### Install & run

```bash
git clone https://github.com/2Pepino/Never-Lost.git
cd Never-Lost
npm install
npm run dev
```

Open **http://localhost:5173** (Vite proxies `/api` to the backend on port **3001**).

| Command | Purpose |
|---------|---------|
| `npm run dev` | Frontend + API together |
| `npm run dev:client` | Vite only (needs API running separately) |
| `npm run dev:server` | API only (`http://localhost:3001`) |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Preview the production build locally |

### API (development)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/catalog` | Catalog split per store (`stores[storeId].categories` + `products`) |
| `GET` | `/api/stores/:storeId/catalog` | One store catalog |
| `GET` | `/api/stores/:storeId/products` | Products for one store |
| `GET` | `/api/stores/:storeId/floorplan` | Saved floor plan |
| `PUT` | `/api/stores/:storeId/floorplan` | Save floor plan `{ elements: [...] }` |

Data file: `server/data/db.json` (created on first run).

**Windows (PowerShell)** — if `npm` is not on your PATH:

```powershell
.\scripts\setup.ps1
.\scripts\dev.ps1
```

---

## Demo account

On first load a shared demo account is seeded:

| Field | Value |
|-------|-------|
| Email | `demo@demo.com` |
| Password | `demo` |

This account can access customer and manager flows depending on how you log in. Create your own account via **Sign up** on the login page.

---

## Project structure (high level)

```
src/
├── pages/           # Customer and manager screens
├── components/      # UI, floor plan renderer, editor palette
├── context/         # Global app state (account profile, cart, stock)
├── data/            # Stores, managers, floor plan types, avatar presets
├── lib/             # Catalog API, routing, personalization, security
└── App.jsx          # Route definitions
```

---

## What this demo is not

- No live indoor GPS or beacons
- No real payment processing
- No production authentication or GDPR-compliant data storage
- No guaranteed sync with real store POS systems (connections are configurable but demo-oriented)

Accounts, carts and inventory are stored in the browser; catalogs and floor plans come from the local API.

---

## License

Private / educational project — check with the repository owner before reuse.
