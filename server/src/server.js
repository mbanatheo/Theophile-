import "dotenv/config";
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
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());

let registrationMode = false;
let pendingUid = null;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "RFID Student API is running", database: getDatabaseStatus() });
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

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ status: "cors_error", message: "Origin is not allowed." });
  }
  res.status(500).json({ status: "server_error", message: "Unexpected server error." });
});

app.listen(PORT, "0.0.0.0", () => console.log(`RFID API running at http://0.0.0.0:${PORT}`));
