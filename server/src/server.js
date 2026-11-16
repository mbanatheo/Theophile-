import express from "express";
import cors from "cors";
import { readDb, writeDb, nextId } from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Business API is running" }));

app.get("/api/dashboard", (_req, res) => {
  const db = readDb();
  const revenue = db.sales.reduce((sum, sale) => sum + sale.total, 0);
  res.json({
    productCount: db.products.length,
    customerCount: db.customers.length,
    salesCount: db.sales.length,
    revenue,
    lowStock: db.products.filter(product => product.stock <= 5)
  });
});

app.get("/api/products", (_req, res) => res.json(readDb().products));

app.post("/api/products", (req, res) => {
  const { name, sku, category, price, stock } = req.body;
  if (!name?.trim() || !sku?.trim() || !category?.trim() ||
      !Number.isFinite(Number(price)) || Number(price) < 0 ||
      !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ message: "Tanga izina, SKU, category, igiciro na stock byemewe." });
  }
  const db = readDb();
  if (db.products.some(p => p.sku.toLowerCase() === sku.trim().toLowerCase())) {
    return res.status(409).json({ message: "Iyo SKU isanzwe ikoreshwa." });
  }
  const product = { id: nextId(db.products), name: name.trim(), sku: sku.trim(), category: category.trim(), price: Number(price), stock: Number(stock) };
  db.products.push(product);
  writeDb(db);
  res.status(201).json(product);
});

app.delete("/api/products/:id", (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  const index = db.products.findIndex(p => p.id === id);
  if (index < 0) return res.status(404).json({ message: "Product ntiyabonetse." });
  const [removed] = db.products.splice(index, 1);
  writeDb(db);
  res.json({ message: "Product yasibwe.", product: removed });
});

app.get("/api/customers", (_req, res) => res.json(readDb().customers));

app.post("/api/customers", (req, res) => {
  const { name, email = "", phone = "" } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Izina ry'umukiriya rirakenewe." });
  const db = readDb();
  const customer = { id: nextId(db.customers), name: name.trim(), email: email.trim(), phone: phone.trim() };
  db.customers.push(customer);
  writeDb(db);
  res.status(201).json(customer);
});

app.get("/api/sales", (_req, res) => res.json(readDb().sales));

app.post("/api/sales", (req, res) => {
  const productId = Number(req.body.productId);
  const customerId = Number(req.body.customerId);
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity igomba kuba nibura 1." });
  }
  const db = readDb();
  const product = db.products.find(p => p.id === productId);
  const customer = db.customers.find(c => c.id === customerId);
  if (!product) return res.status(404).json({ message: "Product ntiyabonetse." });
  if (!customer) return res.status(404).json({ message: "Customer ntiyabonetse." });
  if (product.stock < quantity) return res.status(400).json({ message: "Stock ihari ntihagije." });

  product.stock -= quantity;
  const sale = {
    id: nextId(db.sales), productId, productName: product.name,
    customerId, customerName: customer.name, quantity,
    unitPrice: product.price, total: product.price * quantity,
    date: new Date().toISOString()
  };
  db.sales.push(sale);
  writeDb(db);
  res.status(201).json(sale);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Habaye ikibazo kuri server." });
});

app.listen(PORT, () => console.log(`API iri kuri http://localhost:${PORT}`));
