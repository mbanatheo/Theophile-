import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data");
const dbFile = path.join(dataDir, "db.json");

const initialData = {
  products: [
    { id: 1, name: "Laptop", sku: "ELEC-001", category: "Electronics", price: 850000, stock: 8 },
    { id: 2, name: "Office Chair", sku: "FURN-001", category: "Furniture", price: 120000, stock: 15 },
    { id: 3, name: "Notebook", sku: "STAT-001", category: "Stationery", price: 2500, stock: 60 }
  ],
  customers: [
    { id: 1, name: "Aline Mukamana", email: "aline@example.com", phone: "0780000001" },
    { id: 2, name: "Jean Niyonzima", email: "jean@example.com", phone: "0780000002" }
  ],
  sales: [
    { id: 1, productId: 1, productName: "Laptop", customerId: 1, customerName: "Aline Mukamana", quantity: 1, unitPrice: 850000, total: 850000, date: new Date().toISOString() }
  ]
};

export function readDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

export function writeDb(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

export function nextId(items) {
  return items.length ? Math.max(...items.map(item => item.id)) + 1 : 1;
}
