import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import {
  createStudent,
  createAttendanceRecord,
  deactivateOrDeleteStudent,
  deleteAttendanceRecord,
  getAttendance,
  getClasses,
  getDashboard,
  getDatabaseStatus,
  getDailyReport,
  getStudent,
  getStudents,
  processAttendanceScan,
  updateStudent
} from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDist = path.join(projectRoot, "client", "dist");
const adminPassword = process.env.ADMIN_PASSWORD;
const authTokenSecret = process.env.AUTH_TOKEN_SECRET;
const deviceApiKey = process.env.DEVICE_API_KEY;
const adminAuthEnabled = Boolean(adminPassword && authTokenSecret);
const isProduction = process.env.NODE_ENV === "production";
const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = (corsOrigin || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map(origin => origin.trim()).filter(Boolean);

if (Boolean(adminPassword) !== Boolean(authTokenSecret)) {
  throw new Error("Set both ADMIN_PASSWORD and AUTH_TOKEN_SECRET.");
}
if (isProduction && (!adminAuthEnabled || !deviceApiKey)) {
  throw new Error("Production requires ADMIN_PASSWORD, AUTH_TOKEN_SECRET, and DEVICE_API_KEY.");
}
if (isProduction && (adminPassword.length < 12 || authTokenSecret.length < 32 || deviceApiKey.length < 32)) {
  throw new Error("Production admin password must be at least 12 characters; token and device keys must be at least 32 characters.");
}

app.set("trust proxy", 1);
if (!isProduction || corsOrigin) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    }
  }));
}
app.use(express.json());

let registrationMode = false;
let pendingUid = null;
const failedLogins = new Map();

function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
  })).toString("base64url");
  const signature = createHmac("sha256", authTokenSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function isValidAdminToken(token) {
  if (!authTokenSecret || typeof token !== "string") return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expected = createHmac("sha256", authTokenSecret).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(claims.exp) && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!adminAuthEnabled && !isProduction) return next();
  const token = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ status: "unauthorized", message: "Admin sign-in is required." });
  }
  next();
}

function requireDevice(req, res, next) {
  if (!deviceApiKey && !isProduction) return next();
  const providedKey = req.get("x-device-api-key") || "";
  const providedBytes = Buffer.from(providedKey);
  const expectedBytes = Buffer.from(deviceApiKey || "");
  if (!expectedBytes.length || providedBytes.length !== expectedBytes.length
      || !timingSafeEqual(providedBytes, expectedBytes)) {
    return res.status(401).json({ status: "unauthorized", message: "Device authentication is required." });
  }
  next();
}

app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/login") return next();
  if (["/attendance/scan", "/rfid/pending", "/device/config"].includes(req.path)) {
    return requireDevice(req, res, next);
  }
  requireAdmin(req, res, next);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "RFID Student API is running", database: getDatabaseStatus() });
});

app.post("/api/auth/login", (req, res) => {
  if (!adminAuthEnabled) {
    return res.status(503).json({ status: "auth_not_configured", message: "Admin sign-in is not configured." });
  }

  const now = Date.now();
  const ip = req.ip;
  let attempt = failedLogins.get(ip);
  if (!attempt || now >= attempt.resetAt) {
    attempt = { failures: 0, resetAt: now + 15 * 60 * 1000 };
    failedLogins.set(ip, attempt);
  }
  if (attempt.failures >= 5) {
    return res.status(429).json({ status: "rate_limited", message: "Too many sign-in attempts. Try again later." });
  }

  const providedPassword = Buffer.from(String(req.body?.password || ""));
  const expectedPassword = Buffer.from(adminPassword);
  const matches = providedPassword.length === expectedPassword.length
    && timingSafeEqual(providedPassword, expectedPassword);
  if (!matches) {
    attempt.failures += 1;
    return res.status(401).json({ status: "unauthorized", message: "Incorrect admin password." });
  }

  failedLogins.delete(ip);
  res.json({ token: createAdminToken() });
});

app.get("/api/auth/session", (_req, res) => {
  res.json({ authenticated: true });
});

app.get("/api/dashboard", async (_req, res) => {
  try { res.json(await getDashboard()); }
  catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to load dashboard data." }); }
});

app.get("/api/classes", async (_req, res) => {
  try { res.json(await getClasses()); }
  catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to load classes." }); }
});

app.get("/api/students", async (req, res) => {
  try { res.json(await getStudents({ search: req.query.search, classId: req.query.classId })); }
  catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to load students." }); }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    const student = await getStudent(req.params.id);
    if (!student) return res.status(404).json({ status: "not_found", message: "Student not found." });
    res.json(student);
  } catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to load student." }); }
});

app.post("/api/students", async (req, res) => {
  const { full_name, student_id, class_id } = req.body ?? {};
  if (!full_name?.trim()) return res.status(400).json({ status: "validation_error", message: "Full name is required." });
  if (!student_id?.trim()) return res.status(400).json({ status: "validation_error", message: "RFID UID is required." });
  if (!class_id) return res.status(400).json({ status: "validation_error", message: "Class is required." });

  try {
    const student = await createStudent(req.body);
    res.status(201).json(student);
  } catch (error) {
    if (error.code === "DUPLICATE_UID") return res.status(409).json({ status: "duplicate_uid", message: error.message });
    console.error(error);
    res.status(500).json({ status: "server_error", message: "Failed to register student." });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await updateStudent(req.params.id, req.body);
    if (!student) return res.status(404).json({ status: "not_found", message: "Student not found." });
    res.json(student);
  } catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to update student." }); }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await deactivateOrDeleteStudent(req.params.id);
    if (!student) return res.status(404).json({ status: "not_found", message: "Student not found." });
    res.json({ status: "deactivated", message: "Student deactivated. Attendance history was preserved.", student });
  } catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to deactivate student." }); }
});

app.get("/api/attendance", async (req, res) => {
  try { res.json(await getAttendance({ date: req.query.date, classId: req.query.classId })); }
  catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to load attendance." }); }
});

app.post("/api/attendance", async (req, res) => {
  try {
    const record = await createAttendanceRecord(req.body ?? {});
    res.status(201).json(record);
  } catch (error) {
    if (error.code === "VALIDATION") return res.status(400).json({ status: "validation_error", message: error.message });
    if (error.code === "UNKNOWN_CARD") return res.status(404).json({ status: "unknown_card", message: error.message });
    if (error.code === "INACTIVE_CARD") return res.status(403).json({ status: "inactive_card", message: error.message });
    if (error.code === "DUPLICATE_ATTENDANCE") return res.status(409).json({ status: "duplicate", message: error.message });
    console.error(error);
    res.status(500).json({ status: "server_error", message: "Failed to create attendance record." });
  }
});

app.delete("/api/attendance/:id", async (req, res) => {
  try {
    const record = await deleteAttendanceRecord(req.params.id);
    if (!record) return res.status(404).json({ status: "not_found", message: "Attendance record not found." });
    res.json({ status: "deleted", message: "Attendance record deleted.", record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "server_error", message: "Failed to delete attendance record." });
  }
});

app.post("/api/attendance/scan", async (req, res) => {
  try {
    const record = await processAttendanceScan(req.body?.uid, req.body?.device_id || "esp32-main");
    res.status(201).json({ status: "accepted", message: "Attendance accepted.", record });
  } catch (error) {
    if (error.code === "UNKNOWN_CARD") return res.status(404).json({ status: "unknown_card", message: error.message });
    if (error.code === "DUPLICATE_ATTENDANCE") return res.status(409).json({ status: "duplicate", message: error.message });
    if (error.code === "INACTIVE_CARD") return res.status(403).json({ status: "inactive_card", message: error.message });
    if (error.code === "VALIDATION") return res.status(400).json({ status: "validation_error", message: error.message });
    console.error(error);
    res.status(500).json({ status: "server_error", message: "Failed to process attendance." });
  }
});

app.get("/api/reports/daily", async (req, res) => {
  try { res.json(await getDailyReport(req.query.date)); }
  catch (error) { console.error(error); res.status(500).json({ status: "server_error", message: "Failed to generate report." }); }
});

app.post("/api/registration/start", (_req, res) => {
  registrationMode = true;
  pendingUid = null;
  res.json({ status: "registration_mode", message: "Tap a card on the ESP32 now.", mode: "registration" });
});

app.post("/api/registration/cancel", (_req, res) => {
  registrationMode = false;
  pendingUid = null;
  res.json({ status: "attendance_mode", mode: "attendance" });
});

app.post("/api/rfid/pending", (req, res) => {
  if (!registrationMode) return res.status(409).json({ status: "not_in_registration", message: "Registration mode is not active." });
  pendingUid = String(req.body?.uid || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!pendingUid) return res.status(400).json({ status: "validation_error", message: "Invalid RFID UID." });
  res.json({ status: "pending_uid", uid: pendingUid });
});

app.get("/api/registration/pending", (_req, res) => {
  res.json({ mode: registrationMode ? "registration" : "attendance", uid: pendingUid });
});

app.get("/api/device/config", (_req, res) => {
  res.json({ mode: registrationMode ? "registration" : "attendance", device_id: "esp32-main" });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ status: "not_found", message: "API endpoint not found." });
});

if (isProduction) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res, next) => {
    res.sendFile(path.join(clientDist, "index.html"), error => {
      if (error) next(error);
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ status: "cors_error", message: "Origin is not allowed." });
  }
  res.status(500).json({ status: "server_error", message: "Unexpected server error." });
});

app.listen(PORT, "0.0.0.0", () => console.log(`RFID API running at http://0.0.0.0:${PORT}`));
