# Never Lost

A mobile-first web app that helps shoppers find products in physical stores. Build a list, pick a store, and follow an optimized route on a 2D floor plan. The app personalizes search results and alternatives based on your profile, and includes separate flows for store staff and managers.

**Demo:** [https://github.com/2Pepino/Never-Lost](https://github.com/2Pepino/Never-Lost)

---

## What it does

Never Lost connects three roles in one app:

| Role | Route | Purpose |
|------|-------|---------|
| **Customer** | `/` (login required) | Shopping list, store browse, floor plan navigation |
| **Staff** | `/staff` | Restock shelves, process sales at checkout |
| **Manager** | `/manage` | Edit floor plans, view catalog, connect external APIs |

Everything runs in the browser with seed data in `localStorage` — no backend server.

---

## Customer experience

### Home — stores & Chef

On the home screen you can:

- **Stores** — browse 5 stores around Ghent (simulated location: Korenmarkt), sorted by distance. Search by name, street or type.
- **✨ Chef** — a conversational assistant that asks about time, servings, cuisine and ingredients, then suggests recipes and adds the ingredients to your cart. Supports typing and speech input.

### Cart

Your cart holds:

- Ingredients from the Chef
- Concrete products you added in a store

You can check items off as you shop, remove items, or search and add products manually. At the bottom, the app suggests which store can supply the most items from your list in one trip.

### In a store

Open a store to:

- Search and browse products by category
- See results ranked by your **profile preferences** (brands, diet, departments, price tier)
- Open the **floor plan**, tap to set your starting position, and get a walking route along your cart items
- Check off racks as you visit them — the route and your position update in real time
- After all product stops: route continues to **checkout** and then **exit**

### Product page

- Add/remove from cart
- See stock status: on shelf, in warehouse, or out of stock
- **Out of stock** → personalized alternatives (same category, scored on brand/diet/price) and the same product at other stores
- Route to the product on the floor plan when it is on shelf

### Profile

Under **More / Profile** you can set:

- Personal details (name, email, phone, address)
- Profile photo (presets or custom upload)
- Preferences: departments, diet tags, price tier, favourite brands
- Cashback balance and loyalty info

Guests can use the app but see no personalization.

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

## Staff experience

Login at `/staff/login` (separate from customer login).

| Page | What it does |
|------|----------------|
| **Dashboard** (`/staff`) | View stock by shelf: empty shelves, low stock, well stocked. Move quantity from warehouse to shelves. |
| **Checkout** (`/staff/checkout`) | Scan a product QR/barcode or search, then register a sale (deducts shelf stock). |

Staff accounts are tied to one store.

---

## Manager experience

Login at `/manage/login`.

| Page | What it does |
|------|----------------|
| **Home** | Links to floor plan editor, catalog and connections |
| **Floor plan editor** | Drag walls, fixed/temporary racks, checkout, entrance and exit onto the map. Resize, rotate, assign categories. Preview how customers see it. |
| **Catalog** | Live product list with stock for the manager's store |
| **Connections** | Configure external API endpoints to sync stock (demo/mock supported) |

Floor plans and connections are persisted in `localStorage` per store.

---

## Personalization

The same scoring pattern is used everywhere (`src/lib/personalization.js`):

1. Filter (e.g. in stock, same category)
2. Score (brand match, diet, department, price tier)
3. Sort descending
4. Optional label (“Your brand”, “Fits your budget”, gluten warning)

Logged-in members with preferences get ranked results. Guests get alphabetical / in-stock-first ordering.

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
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| State | React Context + `localStorage` |
| Floor plan | SVG + custom A* pathfinding / aisle graph |
| Security | Client-side password hashing, login lockout (`src/lib/security.js`) |

No backend, database or external map tiles. One optional dependency on custom API URLs configured by managers.

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

Open **http://localhost:5173**

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Preview the production build locally |

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
| Email | `1234@1234` |
| Password | `1234` |

This account can access customer, staff and manager flows depending on how you log in. Create your own account via **Sign up** on the login page.

---

## Project structure (high level)

```
src/
├── pages/           # Customer, staff and manager screens
├── components/      # UI, floor plan renderer, editor palette
├── context/         # Global app state (profiles, cart, stock)
├── data/            # Stores, products, profiles, floor plan types
├── lib/             # Routing, personalization, security, assistant
└── App.jsx          # Route definitions
```

---

## What this demo is not

- No live indoor GPS or beacons
- No real payment processing
- No production authentication or GDPR-compliant data storage
- No guaranteed sync with real store POS systems (connections are configurable but demo-oriented)

All profiles, stock and floor plans are fictional and stored locally in the browser.

---

## License

Private / educational project — check with the repository owner before reuse.
