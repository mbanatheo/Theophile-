# Theophile Business Management System

A full-stack business management system built with React (Vite), Node.js, and Express. It includes a dashboard, inventory/product management, customer tracking, and sales recording.

## About this project
This project was created as a practical business management app and includes both the frontend and API needed to run locally. It also reflects the developer's portfolio work and personal project build.

## Features
- Dashboard summary: products, customers, sales and revenue
- Product/inventory list and add product
- Customer list and add customer
- Record a sale (decreases stock)
- REST API with basic validation
- Local development uses `server/data/db.json`
- Production can use Supabase PostgreSQL

## Requirements
- Node.js 20+ and npm

## Run locally
Open a terminal in this folder:

```bash
npm install
npm run install:all
npm run dev
```

Open the frontend at http://localhost:5173. The API runs at http://localhost:5000.

## Environment setup for deployment
Copy the sample files and update the values for local development:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

- For local development, the API uses the JSON file when Supabase settings are absent.
- To use Supabase locally, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.
- Never put the Supabase service-role key in the frontend or commit it to GitHub.

## Set up Supabase
1. Create a Supabase project.
2. Open the project's SQL Editor and run [`server/supabase/schema.sql`](server/supabase/schema.sql).
3. In the Supabase project settings, copy the project URL and the `service_role` key.
4. Set these backend environment variables in Render (and optionally in `server/.env` for local testing):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGIN` (comma-separated frontend origins)
5. Keep `SUPABASE_SERVICE_ROLE_KEY` private. It bypasses row-level security and belongs only in the backend environment.

When `NODE_ENV=production`, the server refuses to start without both Supabase settings. This prevents a cloud deployment from appearing to work while saving data to an ephemeral local file.

## API endpoints
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/products`
- `POST /api/products`
- `DELETE /api/products/:id`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/sales`
- `POST /api/sales`

## Deployment
- Frontend (Vercel): set the project root to `client`, build command to `npm run build`, and output directory to `dist`. Set `VITE_API_URL` to the deployed Render API URL.
- Backend (Render): set the root directory to `server`, build command to `npm install`, and start command to `npm start`. Set `PORT`, `CORS_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Database: Supabase PostgreSQL, initialized with `server/supabase/schema.sql`.

## Important
This is a learning/demo starter, not production accounting software. It has no login, roles, tax handling, backups, or audit log. Add authentication/authorization and operational safeguards before real business use.
