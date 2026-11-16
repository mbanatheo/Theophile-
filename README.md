# Theophile Business Management System

A full-stack business management system built with React (Vite), Node.js, and Express. This project includes a dashboard, inventory/product management, customer tracking, and sales recording using a local JSON data store in development.

## About this project
This project was created as a practical business management app and includes both the frontend and API needed to run locally. It also reflects the developer's portfolio work and personal project build.

## Features
- Dashboard summary: products, customers, sales and revenue
- Product/inventory list and add product
- Customer list and add customer
- Record a sale (decreases stock)
- REST API with basic validation
- Data persists in `server/data/db.json`

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
Copy the sample files and update the values for your deployment:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

- Frontend: set `VITE_API_URL` to your deployed API URL.
- Backend: set `CORS_ORIGIN` to your deployed frontend domain(s).

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

## Deployment architecture
For a real public deployment, the recommended setup is:
- Frontend: Vercel
- Backend/API: Render or similar Node hosting
- Database: Supabase/PostgreSQL (instead of the local JSON file)

The current JSON file storage is fine for local development, but it cannot reliably persist data on static hosts like Vercel or Netlify alone.

## Important
This is a learning/demo starter, not production accounting software. It has no login, roles, tax handling, backups, audit log, or production-grade database. The JSON file is suitable for local practice only. Before real business use, add authentication/authorization, a database such as PostgreSQL, input hardening, backups, and tests.
