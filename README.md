## Montgomery Grow

Montgomery Grow is an economic intelligence dashboard for Montgomery, Alabama. It helps entrepreneurs, investors, and city officials understand where economic growth is happening across the city.

### Tech Stack

- **Frontend**: React (Vite + TypeScript), Tailwind CSS, React Router, React-Leaflet (maps), Recharts (charts)
- **Backend**: FastAPI, Pandas

### Running the Backend (FastAPI)

```bash
cd "backend"
..\.venv\Scripts\python -m uvicorn main:app --reload --port 8000
```

Key API endpoints:

- `GET /health` – simple health check
- `POST /api/neighborhood-score` – economic opportunity score for a given point/address
- `GET /api/business/licenses-per-year` – time series of new business licenses
- `GET /api/business/category-distribution` – counts by business category
- `GET /api/business/density-heatmap` – active business points for density maps
- `GET /api/development/permits?year=YYYY` – construction permits for the requested year
- `GET /api/visitors/trends` – residents vs commuters vs visitors over time
- `GET /api/visitors/origins` – visitor counts by origin region
- `GET /api/visitors/top-locations` – most visited locations by category
- `POST /api/advisor/query` – lightweight AI-style economic advisor answer

All datasets are currently **synthetic but structured** to mimic real ArcGIS-style civic data. The `backend/database.py` module is the main place to connect to real ArcGIS exports or databases.

### Running the Frontend (React dashboard)

```bash
cd "E:\Bhavya\Web Project\Montgomery Grow\frontend"
npm run dev
```

The Vite dev server defaults to `http://localhost:5173` and talks to the backend at `http://localhost:8000`.



