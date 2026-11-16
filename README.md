# Business Management System

A starter full-stack business management system using React (Vite), Node.js, Express and a JSON-file data store.

## Features
- Dashboard summary: products, customers, sales and revenue
- Product/inventory list and add product
- Customer list and add customer
- Record a sale (decreases stock)
- REST API with basic validation
- Data persists in `server/data/db.json`

## Requirements
- Node.js 20+ and npm

## Run
Open a terminal in this folder:

```bash
npm install
npm run install:all
npm run dev
```

Open the frontend at http://localhost:5173. The API runs at http://localhost:5000.

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

## Important
This is a learning/demo starter, not production accounting software. It has no login, roles, tax handling, backups, audit log, or production-grade database. The JSON file is suitable for local practice only. Before real business use, add authentication/authorization, a database such as PostgreSQL, input hardening, backups and tests.
