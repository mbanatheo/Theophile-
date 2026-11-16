import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  createCustomer,
  createProduct,
  deleteProduct,
  getCustomers,
  getDashboardStats,
  getProducts,
  getSales,
  recordSale
} from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Business API is running" });
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    res.json(await getDashboardStats());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load dashboard data." });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load products." });
  }
});

app.post("/api/products", async (req, res) => {
  const { name, sku, category, price, stock } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()
    || typeof sku !== "string" || !sku.trim()
    || typeof category !== "string" || !category.trim()
    || !Number.isFinite(Number(price)) || Number(price) < 0
    || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ message: "Tanga izina, SKU, category, igiciro na stock byemewe." });
  }

  try {
    const product = await createProduct({
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      price: Number(price),
      stock: Number(stock)
    });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Iyo SKU isanzwe ikoreshwa." });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to create product." });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Product ntiyabonetse." });
  }

  try {
    const product = await deleteProduct(id);
    if (!product) return res.status(404).json({ message: "Product ntiyabonetse." });
    res.json({ message: "Product yasibwe.", product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete product." });
  }
});

app.get("/api/customers", async (_req, res) => {
  try {
    res.json(await getCustomers());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load customers." });
  }
});

app.post("/api/customers", async (req, res) => {
  const { name, email = "", phone = "" } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()
    || typeof email !== "string" || typeof phone !== "string") {
    return res.status(400).json({ message: "Izina ry'umukiriya rirakenewe." });
  }

  try {
    const customer = await createCustomer({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim()
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create customer." });
  }
});

app.get("/api/sales", async (_req, res) => {
  try {
    res.json(await getSales());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load sales." });
  }
});

app.post("/api/sales", async (req, res) => {
  const productId = Number(req.body?.productId);
  const customerId = Number(req.body?.customerId);
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(productId) || productId < 1
    || !Number.isInteger(customerId) || customerId < 1
    || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity igomba kuba nibura 1." });
  }

  try {
    const sale = await recordSale({ productId, customerId, quantity });
    res.status(201).json(sale);
  } catch (error) {
    if (error.code === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Product ntiyabonetse." });
    }
    if (error.code === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({ message: "Customer ntiyabonetse." });
    }
    if (error.code === "INSUFFICIENT_STOCK") {
      return res.status(400).json({ message: "Stock ihari ntihagije." });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to record sale." });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Habaye ikibazo kuri server." });
});

app.listen(PORT, "0.0.0.0", () => console.log(`API iri kuri http://0.0.0.0:${PORT}`));
