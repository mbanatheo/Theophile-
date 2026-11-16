import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Package, Users, ShoppingCart, Plus, Trash2,
  TrendingUp, Boxes, CircleDollarSign, AlertTriangle, Menu, X,
  RefreshCw, Search, Languages
} from "lucide-react";

const copy = {
  en: {
    workspace: "WORKSPACE", overview: "BUSINESS OVERVIEW", dashboard: "Dashboard",
    products: "Products", customers: "Customers", sales: "Sales",
    admin: "Business Admin", localWorkspace: "Local workspace", language: "Language",
    english: "English", kinyarwanda: "Kinyarwanda", refresh: "Refresh",
    closeMenu: "Close menu", addProduct: "Add product",
    addProductDescription: "Add new products to your inventory.",
    productName: "Product name", productNamePlaceholder: "e.g. Laptop",
    sku: "SKU / Code", skuPlaceholder: "ELEC-002", category: "Category",
    categoryPlaceholder: "Electronics", price: "Price (RWF)", stock: "Stock",
    saveProduct: "Save product", inventory: "Inventory",
    productsRegistered: n => `${n} products registered`,
    items: n => `${n} items`, searchProducts: "Search products...",
    deleteProduct: "Delete product", confirmDeleteProduct: "Are you sure you want to delete this product?",
    addCustomer: "Add customer", addCustomerDescription: "Enter the customer's information.",
    fullName: "Full name", email: "Email", phone: "Phone", saveCustomer: "Save customer",
    customerDirectory: "Customer directory", customersCount: n => `${n} customers`,
    recordSale: "Record a sale", recordSaleDescription: "Enter the product that was sold.",
    product: "Product", selectProduct: "Select product", stockLabel: "stock",
    customer: "Customer", selectCustomer: "Select customer", quantity: "Quantity",
    saveSale: "Save sale", stockDeductionHint: "Saving a sale will reduce the product stock.",
    salesHistory: "Sales history", recentTransactions: "Recent transactions",
    saleCount: n => `${n} sales`, noProducts: "No products available.",
    noCustomers: "No customers available.", noSales: "No sales recorded.",
    productHeader: "PRODUCT", skuHeader: "SKU", priceHeader: "PRICE", stockHeader: "STOCK",
    customerHeader: "CUSTOMER", emailHeader: "EMAIL", phoneHeader: "PHONE",
    productCustomerHeader: "PRODUCT / CUSTOMER", quantityHeader: "QTY",
    totalHeader: "TOTAL", dateHeader: "DATE",
    welcome: "Welcome 👋", welcomeDescription: "Here's how your business is doing today.",
    totalProducts: "Total products", totalCustomers: "Total customers",
    totalSales: "Total sales", revenue: "Revenue", liveData: "Live data from API",
    recentSales: "Recent sales", recentSalesDescription: "Latest products sold",
    viewAll: "View all", stockAlerts: "Stock alerts",
    stockAlertsDescription: "Products running low", stockLeft: "left",
    stockOkay: "Stock looks good", noLowStock: "No products are below 5 in stock.",
    manageInventory: "Manage inventory", addCustomerAction: "Add customer",
    recordSaleAction: "Record sale", productDeleted: "Product deleted.",
    saveSuccess: "Saved successfully.", savedRefreshFailed: "Saved, but the data could not be refreshed.",
    apiUnavailable: "Could not reach the API. Check that the server is running on port 5000.",
    invalidJson: status => `The API returned an invalid response (HTTP ${status}).`,
    requestFailed: status => `Request failed (HTTP ${status}).`,
    apiMessages: {
      "Tanga izina, SKU, category, igiciro na stock byemewe.": "Enter a valid product name, SKU, category, price, and stock.",
      "Iyo SKU isanzwe ikoreshwa.": "That SKU is already in use.",
      "Product ntiyabonetse.": "Product not found.",
      "Izina ry'umukiriya rirakenewe.": "Customer name is required.",
      "Quantity igomba kuba nibura 1.": "Quantity must be at least 1.",
      "Customer ntiyabonetse.": "Customer not found.",
      "Stock ihari ntihagije.": "Not enough stock is available.",
      "Habaye ikibazo kuri server.": "A server error occurred."
    }
  },
  rw: {
    workspace: "AHO UKORERA", overview: "INCAMAKE Y'UBUCURUZI", dashboard: "Incamake",
    products: "Ibicuruzwa", customers: "Abakiriya", sales: "Ibyagurishijwe",
    admin: "Umuyobozi w'Ubucuruzi", localWorkspace: "Aho ukorera kuri mudasobwa",
    language: "Ururimi", english: "English", kinyarwanda: "Kinyarwanda",
    refresh: "Kuvugurura", closeMenu: "Funga menu", addProduct: "Ongeramo igicuruzwa",
    addProductDescription: "Shyiramo ibicuruzwa bishya mu bubiko.",
    productName: "Izina ry'igicuruzwa", productNamePlaceholder: "Urugero: Mudasobwa",
    sku: "SKU / Kode", skuPlaceholder: "ELEC-002", category: "Icyiciro",
    categoryPlaceholder: "Ibyuma by'ikoranabuhanga", price: "Igiciro (RWF)",
    stock: "Umubare uri mu bubiko", saveProduct: "Bika igicuruzwa",
    inventory: "Ububiko", productsRegistered: n => `Ibicuruzwa ${n} byanditswe`,
    items: n => `Ibintu ${n}`, searchProducts: "Shakisha ibicuruzwa...",
    deleteProduct: "Siba igicuruzwa",
    confirmDeleteProduct: "Urashaka koko gusiba iki gicuruzwa?",
    addCustomer: "Ongeramo umukiriya",
    addCustomerDescription: "Andika amakuru y'umukiriya.",
    fullName: "Amazina yose", email: "Imeyili", phone: "Telefoni",
    saveCustomer: "Bika umukiriya", customerDirectory: "Urutonde rw'abakiriya",
    customersCount: n => `Abakiriya ${n}`, recordSale: "Andika igurisha",
    recordSaleDescription: "Andika igicuruzwa cyagurishijwe.",
    product: "Igicuruzwa", selectProduct: "Hitamo igicuruzwa", stockLabel: "ibisigaye",
    customer: "Umukiriya", selectCustomer: "Hitamo umukiriya",
    quantity: "Umubare", saveSale: "Bika igurisha",
    stockDeductionHint: "Iyo igurisha ribitswe, umubare w'ibicuruzwa mu bubiko uragabanuka.",
    salesHistory: "Amateka y'ibyagurishijwe", recentTransactions: "Ibikorwa biheruka",
    saleCount: n => `Ibyagurishijwe ${n}`, noProducts: "Nta bicuruzwa bihari.",
    noCustomers: "Nta bakiriya bahari.", noSales: "Nta byagurishijwe birabitswe.",
    productHeader: "IGICURUZWA", skuHeader: "SKU", priceHeader: "IGICIRO",
    stockHeader: "UBUBIKO", customerHeader: "UMUKIRIYA", emailHeader: "IMEYILI",
    phoneHeader: "TELEFONI", productCustomerHeader: "IGICURUZWA / UMUKIRIYA",
    quantityHeader: "UMUBARE", totalHeader: "IGITERANYO", dateHeader: "ITARIKI",
    welcome: "Murakaza neza 👋",
    welcomeDescription: "Dore uko ubucuruzi bwawe buhagaze uyu munsi.",
    totalProducts: "Ibicuruzwa byose", totalCustomers: "Abakiriya bose",
    totalSales: "Ibyagurishijwe byose", revenue: "Amafaranga yinjiye",
    liveData: "Amakuru mashya ava kuri API",
    recentSales: "Ibyagurishijwe vuba",
    recentSalesDescription: "Ibicuruzwa biheruka kugurishwa",
    viewAll: "Reba byose", stockAlerts: "Imenyesha ry'ububiko",
    stockAlertsDescription: "Ibicuruzwa biri hafi gushira", stockLeft: "bisigaye",
    stockOkay: "Ububiko bumeze neza",
    noLowStock: "Nta gicuruzwa kiri munsi y'ibintu 5.",
    manageInventory: "Genzura ububiko", addCustomerAction: "Ongeramo umukiriya",
    recordSaleAction: "Andika igurisha", productDeleted: "Igicuruzwa cyasibwe.",
    saveSuccess: "Amakuru yabitswe neza.",
    savedRefreshFailed: "Amakuru yabitswe, ariko ntibyashobotse kuyavugurura.",
    apiUnavailable: "API ntiyabonetse. Reba niba server iri gukora kuri port 5000.",
    invalidJson: status => `API yagaruye igisubizo kitari JSON (HTTP ${status}).`,
    requestFailed: status => `Icyifuzo nticyakunze (HTTP ${status}).`,
    apiMessages: {}
  }
};

const money = (value, language) => new Intl.NumberFormat(language === "rw" ? "rw-RW" : "en-RW", {
  style: "currency", currency: "RWF", maximumFractionDigits: 0
}).format(value || 0);

async function api(path, options = {}, language = "en") {
  const t = copy[language];
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error(t.apiUnavailable);
  }

  const body = await response.text();
  let data = null;
  if (body) {
    try { data = JSON.parse(body); }
    catch {
      throw new Error(t.invalidJson(response.status));
    }
  }
  if (!response.ok) {
    throw new Error(t.apiMessages[data?.message] || data?.message || t.requestFailed(response.status));
  }
  return data;
}

export default function App() {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("bizmanager-language") === "rw" ? "rw" : "en"
  );
  const t = copy[language];
  const [page, setPage] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  async function refresh() {
    try {
      setError("");
      const [d, p, c, s] = await Promise.all([
        api("/dashboard", {}, language), api("/products", {}, language),
        api("/customers", {}, language), api("/sales", {}, language)
      ]);
      setDashboard(d); setProducts(p); setCustomers(c); setSales(s);
      return true;
    } catch (e) { setError(e.message); return false; }
  }

  useEffect(() => {
    localStorage.setItem("bizmanager-language", language);
    refresh();
  }, [language]);

  async function submitForm(event, path, onSuccess) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await api(path, { method: "POST", body: JSON.stringify(payload) }, language);
      form.reset();
      setError("");
      const refreshed = await refresh();
      setNotice(refreshed
        ? t.saveSuccess
        : t.savedRefreshFailed);
      onSuccess?.();
    } catch (e) { setError(e.message); }
  }

  async function deleteProduct(id) {
    if (!window.confirm(t.confirmDeleteProduct)) return;
    try {
      await api(`/products/${id}`, { method: "DELETE" }, language);
      setNotice(t.productDeleted);
      await refresh();
    }
    catch (e) { setError(e.message); }
  }

  const filteredProducts = useMemo(() => products.filter(p =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  const nav = [
    ["dashboard", t.dashboard, LayoutDashboard],
    ["products", t.products, Package],
    ["customers", t.customers, Users],
    ["sales", t.sales, ShoppingCart]
  ];

  function navigate(id) { setPage(id); setMobileOpen(false); setError(""); setNotice(""); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">B</div><div><b>BizManager</b><small>BUSINESS SUITE</small></div><button className="close-menu" aria-label={t.closeMenu} onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="nav-label">{t.workspace}</div>
      {nav.map(([id, label, Icon]) => <button key={id} className={`nav-link ${page === id ? "active" : ""}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span></button>)}
      <div className="sidebar-bottom"><div className="avatar">BM</div><div><b>{t.admin}</b><small>{t.localWorkspace}</small></div></div>
    </aside>

    {mobileOpen && <button className="scrim" aria-label={t.closeMenu} onClick={() => setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" aria-label={t.workspace} onClick={() => setMobileOpen(true)}><Menu/></button>
        <div><span className="eyebrow">{t.overview}</span><h1>{nav.find(n => n[0] === page)?.[1]}</h1></div>
        <div className="topbar-actions">
          <label className="language-control">
            <Languages size={16}/>
            <select aria-label={t.language} value={language} onChange={event => setLanguage(event.target.value)}>
              <option value="en">{t.english}</option>
              <option value="rw">{t.kinyarwanda}</option>
            </select>
          </label>
          <button className="refresh-btn" onClick={refresh}><RefreshCw size={16}/> <span>{t.refresh}</span></button>
        </div>
      </header>

      {error && <div className="alert error"><AlertTriangle size={17}/>{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="alert success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {page === "dashboard" && <Dashboard dashboard={dashboard} sales={sales} setPage={setPage} t={t} language={language}/>}
      {page === "products" && <section className="content-grid">
        <div className="panel form-panel"><div className="panel-heading"><div><h2>{t.addProduct}</h2><p>{t.addProductDescription}</p></div><span className="icon-tile purple"><Package/></span></div>
          <form onSubmit={e => submitForm(e, "/products")}>
            <label>{t.productName}<input name="name" placeholder={t.productNamePlaceholder} required/></label>
            <label>{t.sku}<input name="sku" placeholder={t.skuPlaceholder} required/></label>
            <label>{t.category}<input name="category" placeholder={t.categoryPlaceholder} required/></label>
            <div className="form-row"><label>{t.price}<input name="price" type="number" min="0" step="1" required/></label><label>{t.stock}<input name="stock" type="number" min="0" step="1" required/></label></div>
            <button className="primary-btn"><Plus size={17}/> {t.saveProduct}</button>
          </form>
        </div>
        <div className="panel table-panel"><div className="panel-heading"><div><h2>{t.inventory}</h2><p>{t.productsRegistered(products.length)}</p></div><span className="count-pill">{t.items(products.length)}</span></div>
          <div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchProducts}/></div>
          <ProductTable products={filteredProducts} onDelete={deleteProduct} t={t} language={language}/>
        </div>
      </section>}

      {page === "customers" && <section className="content-grid">
        <div className="panel form-panel"><div className="panel-heading"><div><h2>{t.addCustomer}</h2><p>{t.addCustomerDescription}</p></div><span className="icon-tile blue"><Users/></span></div>
          <form onSubmit={e => submitForm(e, "/customers")}>
            <label>{t.fullName}<input name="name" placeholder="Aline Mukamana" required/></label>
            <label>{t.email}<input name="email" type="email" placeholder="name@example.com"/></label>
            <label>{t.phone}<input name="phone" placeholder="078..." /></label>
            <button className="primary-btn"><Plus size={17}/> {t.saveCustomer}</button>
          </form>
        </div>
        <div className="panel table-panel"><div className="panel-heading"><div><h2>{t.customers}</h2><p>{t.customerDirectory}</p></div><span className="count-pill">{t.customersCount(customers.length)}</span></div><CustomerTable customers={customers} t={t}/></div>
      </section>}

      {page === "sales" && <section className="content-grid">
        <div className="panel form-panel"><div className="panel-heading"><div><h2>{t.recordSale}</h2><p>{t.recordSaleDescription}</p></div><span className="icon-tile green"><ShoppingCart/></span></div>
          <form onSubmit={e => submitForm(e, "/sales")}>
            <label>{t.product}<select name="productId" required defaultValue=""><option value="" disabled>{t.selectProduct}</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} — {t.stockLabel}: {p.stock}</option>)}</select></label>
            <label>{t.customer}<select name="customerId" required defaultValue=""><option value="" disabled>{t.selectCustomer}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>{t.quantity}<input name="quantity" type="number" min="1" step="1" placeholder="1" required/></label>
            <button className="primary-btn"><Plus size={17}/> {t.saveSale}</button>
          </form>
          <p className="form-hint">{t.stockDeductionHint}</p>
        </div>
        <div className="panel table-panel"><div className="panel-heading"><div><h2>{t.salesHistory}</h2><p>{t.recentTransactions}</p></div><span className="count-pill">{t.saleCount(sales.length)}</span></div><SalesTable sales={sales} t={t} language={language}/></div>
      </section>}
      <footer>BizManager <span>•</span> {language === "en" ? "Learning project built with React & Node.js" : "Porogaramu yo kwiga yakozwe hakoreshejwe React na Node.js"}</footer>
    </main>
  </div>;
}

function Dashboard({ dashboard, sales, setPage, t, language }) {
  const stats = [
    [t.totalProducts, dashboard?.productCount ?? "—", Package, "purple"],
    [t.totalCustomers, dashboard?.customerCount ?? "—", Users, "blue"],
    [t.totalSales, dashboard?.salesCount ?? "—", ShoppingCart, "orange"],
    [t.revenue, money(dashboard?.revenue, language), CircleDollarSign, "green"]
  ];
  return <div className="dashboard-content">
    <div className="welcome-row"><div><h2>{t.welcome}</h2><p>{t.welcomeDescription}</p></div><span className="date-chip">{new Date().toLocaleDateString(language === "rw" ? "rw-RW" : "en-RW")}</span></div>
    <div className="stats-grid">{stats.map(([label, value, Icon, color]) => <div className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small><TrendingUp size={13}/> {t.liveData}</small></div>)}</div>
    <div className="dashboard-lower">
      <div className="panel"><div className="panel-heading"><div><h2>{t.recentSales}</h2><p>{t.recentSalesDescription}</p></div><button className="text-btn" onClick={() => setPage("sales")}>{t.viewAll}</button></div><SalesTable sales={sales.slice(-5).reverse()} t={t} language={language}/></div>
      <div className="panel"><div className="panel-heading"><div><h2>{t.stockAlerts}</h2><p>{t.stockAlertsDescription}</p></div><span className="icon-tile orange"><AlertTriangle/></span></div>
        {(dashboard?.lowStock || []).length ? dashboard.lowStock.map(p => <div className="stock-alert" key={p.id}><div><b>{p.name}</b><small>{p.sku}</small></div><span>{p.stock} {t.stockLeft}</span></div>) : <div className="empty-state"><Boxes size={28}/><b>{t.stockOkay}</b><small>{t.noLowStock}</small></div>}
        <button className="secondary-btn full" onClick={() => setPage("products")}>{t.manageInventory}</button>
      </div>
    </div>
    <div className="quick-actions"><button onClick={() => setPage("products")}><Plus size={16}/> {t.addProduct}</button><button onClick={() => setPage("customers")}><Plus size={16}/> {t.addCustomerAction}</button><button onClick={() => setPage("sales")}><Plus size={16}/> {t.recordSaleAction}</button></div>
  </div>;
}

function ProductTable({ products, onDelete, t, language }) {
  if (!products.length) return <Empty text={t.noProducts} />;
  return <div className="table-wrap"><table><thead><tr><th>{t.productHeader}</th><th>{t.skuHeader}</th><th>{t.priceHeader}</th><th>{t.stockHeader}</th><th></th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><b>{p.name}</b><small className="cell-sub">{p.category}</small></td><td>{p.sku}</td><td>{money(p.price, language)}</td><td><span className={`stock-badge ${p.stock <= 5 ? "low" : ""}`}>{p.stock}</span></td><td><button className="delete-btn" title={t.deleteProduct} aria-label={`${t.deleteProduct}: ${p.name}`} onClick={() => onDelete(p.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>;
}
function CustomerTable({ customers, t }) {
  if (!customers.length) return <Empty text={t.noCustomers} />;
  return <div className="table-wrap"><table><thead><tr><th>{t.customerHeader}</th><th>{t.emailHeader}</th><th>{t.phoneHeader}</th></tr></thead><tbody>{customers.map(c => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.email || "—"}</td><td>{c.phone || "—"}</td></tr>)}</tbody></table></div>;
}
function SalesTable({ sales, t, language }) {
  if (!sales.length) return <Empty text={t.noSales} />;
  return <div className="table-wrap"><table><thead><tr><th>{t.productCustomerHeader}</th><th>{t.quantityHeader}</th><th>{t.totalHeader}</th><th>{t.dateHeader}</th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td><b>{s.productName}</b><small className="cell-sub">{s.customerName}</small></td><td>{s.quantity}</td><td><b>{money(s.total, language)}</b></td><td>{new Date(s.date).toLocaleDateString(language === "rw" ? "rw-RW" : "en-RW")}</td></tr>)}</tbody></table></div>;
}
function Empty({ text }) { return <div className="empty-state"><Boxes size={28}/><span>{text}</span></div>; }
