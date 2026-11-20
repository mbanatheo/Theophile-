import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data");
const dbFile = path.join(dataDir, "db.json");

const initialData = {
  classes: [
    { id: 1, class_name: "Year 1", description: "First year students" },
    { id: 2, class_name: "Year 2", description: "Second year students" }
  ],
  students: [],
  attendance: []
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
  return items.length ? Math.max(...items.map(item => Number(item.id) || 0)) + 1 : 1;
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function throwIfError(error) {
  if (error) throw error;
}

function normalizeUid(uid) {
  return String(uid || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getDatabaseStatus() {
  return {
    type: supabase ? "supabase" : "local_json"
  };
}

export async function getClasses() {
  if (!supabase) return readLocalDb().classes;
  const { data, error } = await supabase.from("classes").select("*").order("class_name");
  throwIfError(error);
  return data;
}

export async function getStudents({ search = "", classId = "" } = {}) {
  if (!supabase) {
    const db = readLocalDb();
    const needle = search.trim().toLowerCase();
    return db.students.filter(student => {
      const matchesSearch = !needle
        || student.full_name.toLowerCase().includes(needle)
        || student.student_id.toLowerCase().includes(needle);
      const matchesClass = !classId
        || String(student.class_id) === String(classId)
        || student.class_name === classId;
      return matchesSearch && matchesClass;
    });
  }

  let query = supabase.from("students").select("*").order("full_name");
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  throwIfError(error);
  const needle = search.trim().toLowerCase();
  return (data || []).filter(student =>
    !needle
    || student.full_name.toLowerCase().includes(needle)
    || student.student_id.toLowerCase().includes(needle)
  );
}

export async function getStudent(id) {
  if (!supabase) {
    const db = readLocalDb();
    return db.students.find(student => String(student.id) === String(id)) || null;
  }
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data;
}

export async function createStudent(student) {
  const studentId = normalizeUid(student.student_id);
  if (!studentId) throw createError("VALIDATION", "RFID UID is required.");

  if (!supabase) {
    const db = readLocalDb();
    if (db.students.some(item => normalizeUid(item.student_id) === studentId)) {
      throw createError("DUPLICATE_UID", "This RFID UID is already assigned.");
    }
    const created = {
      id: nextId(db.students),
      student_id: studentId,
      full_name: student.full_name.trim(),
      gender: student.gender || "",
      class_id: Number(student.class_id),
      class_name: db.classes.find(item => item.id === Number(student.class_id))?.class_name || student.class_name || "",
      phone: student.phone || "",
      email: student.email || "",
      registration_date: today(),
      active_status: true
    };
    db.students.push(created);
    writeLocalDb(db);
    return created;
  }

  const { data: existing, error: existingError } = await supabase
    .from("students").select("id").eq("student_id", studentId).maybeSingle();
  throwIfError(existingError);
  if (existing) throw createError("DUPLICATE_UID", "This RFID UID is already assigned.");

  const payload = {
    student_id: studentId,
    full_name: student.full_name.trim(),
    gender: student.gender || "",
    class_id: student.class_id ? Number(student.class_id) : null,
    phone: student.phone || "",
    email: student.email || "",
    registration_date: today(),
    active_status: true
  };
  const { data, error } = await supabase.from("students").insert(payload).select().single();
  throwIfError(error);
  return data;
}

export async function updateStudent(id, changes) {
  if (!supabase) {
    const db = readLocalDb();
    const student = db.students.find(item => String(item.id) === String(id));
    if (!student) return null;
    if (changes.full_name !== undefined) {
      if (!changes.full_name?.trim()) throw createError("VALIDATION", "Full name is required.");
      student.full_name = changes.full_name.trim();
    }
    if (changes.class_id !== undefined) {
      const classId = Number(changes.class_id);
      if (!db.classes.some(item => item.id === classId)) {
        throw createError("VALIDATION", "Class is invalid.");
      }
      student.class_id = classId;
      student.class_name = db.classes.find(item => item.id === classId)?.class_name || "";
    }
    if (changes.gender !== undefined) student.gender = changes.gender;
    if (changes.phone !== undefined) student.phone = changes.phone;
    if (changes.email !== undefined) student.email = changes.email;
    if (changes.active_status !== undefined) student.active_status = Boolean(changes.active_status);
    writeLocalDb(db);
    return student;
  }

  const payload = {};
  if (changes.full_name !== undefined) {
    if (!changes.full_name?.trim()) throw createError("VALIDATION", "Full name is required.");
    payload.full_name = changes.full_name.trim();
  }
  for (const key of ["full_name", "gender", "phone", "email", "active_status", "class_id"]) {
    if (changes[key] !== undefined && key !== "full_name") {
      payload[key] = key === "class_id" ? Number(changes[key]) : changes[key];
    }
  }
  const { data, error } = await supabase.from("students").update(payload).eq("id", id).select().maybeSingle();
  throwIfError(error);
  return data;
}

export async function deactivateOrDeleteStudent(id) {
  if (!supabase) {
    const db = readLocalDb();
    const student = db.students.find(item => String(item.id) === String(id));
    if (!student) return null;
    student.active_status = false;
    writeLocalDb(db);
    return student;
  }
  const { data, error } = await supabase
    .from("students").update({ active_status: false }).eq("id", id).select().maybeSingle();
  throwIfError(error);
  return data;
}

export async function getAttendance({ date = "", classId = "" } = {}) {
  if (!supabase) {
    const db = readLocalDb();
    return db.attendance
      .filter(record => !date || record.attendance_date === date)
      .filter(record => !classId || String(record.class_id) === String(classId))
      .sort((a, b) => `${b.attendance_date} ${b.attendance_time}`.localeCompare(`${a.attendance_date} ${a.attendance_time}`));
  }

  let query = supabase
    .from("attendance")
    .select("*, students(full_name, student_id, class_id)")
    .order("attendance_date", { ascending: false })
    .order("attendance_time", { ascending: false });
  if (date) query = query.eq("attendance_date", date);
  const { data, error } = await query;
  throwIfError(error);
  return (data || []).filter(record => !classId || String(record.students?.class_id) === String(classId));
}

export async function createAttendanceRecord(record) {
  const studentId = normalizeUid(record.student_id);
  if (!studentId) throw createError("VALIDATION", "Student RFID UID is required.");

  const attendanceDate = String(record.attendance_date || today());
  const sessionId = String(record.session_id || "default");
  const now = new Date();

  if (!supabase) {
    const db = readLocalDb();
    const student = db.students.find(item => normalizeUid(item.student_id) === studentId);
    if (!student) throw createError("UNKNOWN_CARD", "This RFID card is not registered.");
    if (!student.active_status) throw createError("INACTIVE_CARD", "This student is inactive.");

    const already = db.attendance.find(item =>
      item.student_id === student.student_id
      && item.attendance_date === attendanceDate
      && item.session_id === sessionId
    );
    if (already) throw createError("DUPLICATE_ATTENDANCE", "Attendance was already recorded for this session.");

    const created = {
      id: nextId(db.attendance),
      student_id: student.student_id,
      full_name: student.full_name,
      class_id: student.class_id,
      class_name: student.class_name,
      attendance_date: attendanceDate,
      attendance_time: record.attendance_time || now.toISOString().slice(11, 19),
      status: record.status || "present",
      session_id: sessionId,
      device_id: record.device_id || "admin",
      created_at: now.toISOString()
    };
    db.attendance.push(created);
    writeLocalDb(db);
    return created;
  }

  const { data: student, error: studentError } = await supabase
    .from("students").select("*").eq("student_id", studentId).maybeSingle();
  throwIfError(studentError);
  if (!student) throw createError("UNKNOWN_CARD", "This RFID card is not registered.");
  if (!student.active_status) throw createError("INACTIVE_CARD", "This student is inactive.");

  const { data: duplicate, error: duplicateError } = await supabase
    .from("attendance").select("id").eq("student_id", studentId)
    .eq("attendance_date", attendanceDate).eq("session_id", sessionId).maybeSingle();
  throwIfError(duplicateError);
  if (duplicate) throw createError("DUPLICATE_ATTENDANCE", "Attendance was already recorded for this session.");

  const payload = {
    student_id: studentId,
    attendance_date: attendanceDate,
    attendance_time: record.attendance_time || now.toISOString().slice(11, 19),
    status: record.status || "present",
    session_id: sessionId,
    device_id: record.device_id || "admin",
    created_at: now.toISOString()
  };
  const { data, error } = await supabase.from("attendance").insert(payload).select().single();
  throwIfError(error);
  return { ...data, full_name: student.full_name, class_id: student.class_id };
}

export async function deleteAttendanceRecord(id) {
  if (!supabase) {
    const db = readLocalDb();
    const index = db.attendance.findIndex(record => String(record.id) === String(id));
    if (index === -1) return null;
    const [deleted] = db.attendance.splice(index, 1);
    writeLocalDb(db);
    return deleted;
  }

  const { data, error } = await supabase
    .from("attendance").delete().eq("id", id).select().maybeSingle();
  throwIfError(error);
  return data;
}

export async function processAttendanceScan(uid, deviceId = "esp32-main") {
  const studentId = normalizeUid(uid);
  if (!studentId) throw createError("VALIDATION", "RFID UID is required.");

  if (!supabase) {
    const db = readLocalDb();
    const student = db.students.find(item => normalizeUid(item.student_id) === studentId);
    if (!student) throw createError("UNKNOWN_CARD", "This RFID card is not registered.");
    if (!student.active_status) throw createError("INACTIVE_CARD", "This student is inactive.");

    const date = today();
    const already = db.attendance.find(record =>
      record.student_id === student.student_id
      && record.attendance_date === date
      && record.session_id === "default"
    );
    if (already) throw createError("DUPLICATE_ATTENDANCE", "Attendance was already recorded for this session.");

    const now = new Date();
    const record = {
      id: nextId(db.attendance),
      student_id: student.student_id,
      full_name: student.full_name,
      class_id: student.class_id,
      class_name: student.class_name,
      attendance_date: date,
      attendance_time: now.toISOString().slice(11, 19),
      status: "present",
      session_id: "default",
      device_id: deviceId,
      created_at: now.toISOString()
    };
    db.attendance.push(record);
    writeLocalDb(db);
    return record;
  }

  const { data: student, error: studentError } = await supabase
    .from("students").select("*").eq("student_id", studentId).maybeSingle();
  throwIfError(studentError);
  if (!student) throw createError("UNKNOWN_CARD", "This RFID card is not registered.");
  if (!student.active_status) throw createError("INACTIVE_CARD", "This student is inactive.");

  const date = today();
  const { data: duplicate, error: duplicateError } = await supabase
    .from("attendance").select("id").eq("student_id", studentId)
    .eq("attendance_date", date).eq("session_id", "default").maybeSingle();
  throwIfError(duplicateError);
  if (duplicate) throw createError("DUPLICATE_ATTENDANCE", "Attendance was already recorded for this session.");

  const now = new Date();
  const payload = {
    student_id: studentId,
    attendance_date: date,
    attendance_time: now.toISOString().slice(11, 19),
    status: "present",
    session_id: "default",
    device_id: deviceId,
    created_at: now.toISOString()
  };
  const { data, error } = await supabase.from("attendance").insert(payload).select().single();
  throwIfError(error);
  return { ...data, full_name: student.full_name, class_id: student.class_id };
}

export async function getDashboard() {
  const [students, attendance] = await Promise.all([getStudents(), getAttendance()]);
  const date = today();
  const presentIds = new Set(
    attendance.filter(record => record.attendance_date === date).map(record =>
      record.student_id
    )
  );
  const activeStudents = students.filter(student => student.active_status !== false);
  const present = presentIds.size;
  const absent = Math.max(activeStudents.length - present, 0);
  const percentage = activeStudents.length ? Math.round((present / activeStudents.length) * 100) : 0;
  return {
    totalStudents: activeStudents.length,
    attendanceToday: present,
    present,
    absent,
    attendancePercentage: percentage,
    date
  };
}

export async function getDailyReport(date = today()) {
  const [students, attendance] = await Promise.all([
    getStudents(),
    getAttendance({ date })
  ]);
  const active = students.filter(student => student.active_status !== false);
  const presentIds = new Set(attendance.map(record => record.student_id));
  return {
    date,
    totalStudents: active.length,
    present: presentIds.size,
    absent: active.length - presentIds.size,
    percentage: active.length ? Math.round((presentIds.size / active.length) * 100) : 0,
    records: attendance
  };
}
