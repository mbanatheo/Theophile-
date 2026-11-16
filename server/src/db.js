import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (Boolean(supabaseUrl) !== Boolean(supabaseServiceRoleKey)) {
  throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

if (process.env.NODE_ENV === "production" && !supabaseUrl) {
  throw new Error("Production requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

function readLocalDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function writeLocalDb(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function nextId(items) {
  return items.length ? Math.max(...items.map(item => item.id)) + 1 : 1;
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function throwIfError(error) {
  if (error) throw error;
}

export async function getProducts() {
  if (!supabase) return readLocalDb().products;

  const { data, error } = await supabase.from("products").select("*").order("id");
  throwIfError(error);
  return data;
}

export async function createProduct(product) {
  if (!supabase) {
    const db = readLocalDb();
    if (db.products.some(item => item.sku.toLowerCase() === product.sku.toLowerCase())) {
      throw createError("23505", "Product SKU already exists.");
    }
    const created = { id: nextId(db.products), ...product };
    db.products.push(created);
    writeLocalDb(db);
    return created;
  }

  const { data, error } = await supabase.from("products").insert(product).select().single();
  throwIfError(error);
  return data;
}

export async function deleteProduct(id) {
  if (!supabase) {
    const db = readLocalDb();
    const index = db.products.findIndex(product => product.id === id);
    if (index < 0) return null;
    const [removed] = db.products.splice(index, 1);
    writeLocalDb(db);
    return removed;
  }

  const { data, error } = await supabase.from("products").delete().eq("id", id).select().maybeSingle();
  throwIfError(error);
  return data;
}

export async function getCustomers() {
  if (!supabase) return readLocalDb().customers;

  const { data, error } = await supabase.from("customers").select("*").order("id");
  throwIfError(error);
  return data;
}

export async function createCustomer(customer) {
  if (!supabase) {
    const db = readLocalDb();
    const created = { id: nextId(db.customers), ...customer };
    db.customers.push(created);
    writeLocalDb(db);
    return created;
  }

  const { data, error } = await supabase.from("customers").insert(customer).select().single();
  throwIfError(error);
  return data;
}

export async function getSales() {
  if (!supabase) return readLocalDb().sales;

  const { data, error } = await supabase
    .from("sales")
    .select("id, productId:product_id, productName:product_name, customerId:customer_id, customerName:customer_name, quantity, unitPrice:unit_price, total, date")
    .order("id");
  throwIfError(error);
  return data;
}

export async function recordSale({ productId, customerId, quantity }) {
  if (!supabase) {
    const db = readLocalDb();
    const product = db.products.find(item => item.id === productId);
    const customer = db.customers.find(item => item.id === customerId);

    if (!product) throw createError("PRODUCT_NOT_FOUND", "Product not found.");
    if (!customer) throw createError("CUSTOMER_NOT_FOUND", "Customer not found.");
    if (product.stock < quantity) throw createError("INSUFFICIENT_STOCK", "Insufficient stock.");

    product.stock -= quantity;
    const sale = {
      id: nextId(db.sales),
      productId,
      productName: product.name,
      customerId,
      customerName: customer.name,
      quantity,
      unitPrice: product.price,
      total: product.price * quantity,
      date: new Date().toISOString()
    };
    db.sales.push(sale);
    writeLocalDb(db);
    return sale;
  }

  const { data, error } = await supabase.rpc("record_sale", {
    p_product_id: productId,
    p_customer_id: customerId,
    p_quantity: quantity
  });
  throwIfError(error);

  if (data?.error === "product_not_found") {
    throw createError("PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (data?.error === "customer_not_found") {
    throw createError("CUSTOMER_NOT_FOUND", "Customer not found.");
  }
  if (data?.error === "insufficient_stock") {
    throw createError("INSUFFICIENT_STOCK", "Insufficient stock.");
  }
  return data;
}

export async function getDashboardStats() {
  const [products, customers, sales] = await Promise.all([
    getProducts(),
    getCustomers(),
    getSales()
  ]);
  return {
    productCount: products.length,
    customerCount: customers.length,
    salesCount: sales.length,
    revenue: sales.reduce((sum, sale) => sum + Number(sale.total), 0),
    lowStock: products.filter(product => Number(product.stock) <= 5)
  };
}
