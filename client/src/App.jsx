import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, ContactRound, ClipboardCheck, FileChartColumn,
  Plus, Search, RefreshCw, Menu, X, ScanLine, UserPen, ToggleLeft, Trash2
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function api(path, options = {}) {
  const response = await fetch(API_BASE ? `${API_BASE}${path}` : `/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); }
    catch { throw new Error(`Invalid server response (HTTP ${response.status}).`); }
  }
  if (!response.ok) throw new Error(body.message || `Request failed (HTTP ${response.status}).`);
  return body;
}

const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "—";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [report, setReport] = useState(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [registrationMode, setRegistrationMode] = useState(false);
  const [pendingUid, setPendingUid] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      setError("");
      const [d, s, c, a] = await Promise.all([
        api("/dashboard"), api("/students"), api("/classes"),
        api("/attendance")
      ]);
      setDashboard(d); setStudents(s); setClasses(c); setAttendance(a);
    } catch (e) { setError(e.message); }
    finally { setRefreshing(false); }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!registrationMode) return undefined;
    const interval = setInterval(async () => {
      try {
        const pending = await api("/registration/pending");
        setPendingUid(pending.uid || "");
      } catch (e) { setError(e.message); }
    }, 1000);
    return () => clearInterval(interval);
  }, [registrationMode]);

  async function startRegistration() {
    try {
      await api("/registration/start", { method: "POST" });
      setRegistrationMode(true); setPendingUid(""); setNotice("Registration mode active. Tap a card on the ESP32.");
      setPage("students");
    } catch (e) { setError(e.message); }
  }

  async function cancelRegistration() {
    try {
      await api("/registration/cancel", { method: "POST" });
      setRegistrationMode(false); setPendingUid(""); setNotice("Returned to attendance mode.");
    } catch (e) { setError(e.message); }
  }

  async function saveStudent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.active_status = true;
    try {
      await api("/students", { method: "POST", body: JSON.stringify(payload) });
      form.reset();
      setRegistrationMode(false);
      setPendingUid("");
      await api("/registration/cancel", { method: "POST" });
      await refresh();
      setNotice("Student registered and RFID card assigned.");
    } catch (e) { setError(e.message); }
  }

  async function deactivateStudent(id) {
    if (!window.confirm("Deactivate this student? Attendance history will be preserved.")) return;
    try {
      await api(`/students/${id}`, { method: "DELETE" });
      setNotice("Student deactivated.");
      await refresh();
    } catch (e) { setError(e.message); }
  }

  async function postAttendance(event) {
    event.preventDefault();
    if (!manualStudentId) return;
    try {
      await api("/attendance", {
        method: "POST",
        body: JSON.stringify({
          student_id: manualStudentId,
          attendance_date: manualDate,
          status: "present",
          session_id: "default",
          device_id: "admin"
        })
      });
      setNotice("Attendance posted.");
      await loadAttendanceFilters(manualDate, classFilter);
      await refresh();
    } catch (e) { setError(e.message); }
  }

  async function deleteAttendanceRecord(id) {
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      await api(`/attendance/${id}`, { method: "DELETE" });
      setNotice("Attendance record deleted.");
      await loadAttendanceFilters(attendanceDate, classFilter);
      await refresh();
    } catch (e) { setError(e.message); }
  }

  async function loadAttendanceFilters(date = attendanceDate, classId = classFilter) {
    try {
      const query = new URLSearchParams();
      if (date) query.set("date", date);
      if (classId) query.set("classId", classId);
      setAttendance(await api(`/attendance${query.size ? `?${query}` : ""}`));
    } catch (e) { setError(e.message); }
  }

  async function loadDailyReport(date) {
    try {
      setReport(await api(`/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`));
    } catch (e) { setError(e.message); }
  }

  const filteredStudents = useMemo(() => students.filter(student => {
    const needle = search.trim().toLowerCase();
    return (!needle || student.full_name.toLowerCase().includes(needle) || student.student_id.toLowerCase().includes(needle))
      && (!classFilter || String(student.class_id) === String(classFilter));
  }), [students, search, classFilter]);

  const nav = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["students", "Students", Users],
    ["attendance", "Attendance", ClipboardCheck],
    ["reports", "Reports", FileChartColumn]
  ];

  function navigate(id) {
    setPage(id); setMobileOpen(false); setError(""); setNotice("");
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">RF</div>
        <div><b>RFID Campus</b><small>ATTENDANCE SYSTEM</small></div>
        <button className="close-menu" onClick={() => setMobileOpen(false)}><X size={18}/></button>
      </div>
      <div className="nav-label">ADMINISTRATION</div>
      {nav.map(([id, label, Icon]) =>
        <button key={id} className={`nav-link ${page === id ? "active" : ""}`} onClick={() => navigate(id)}>
          <Icon size={18}/><span>{label}</span>
        </button>
      )}
      <div className="sidebar-bottom">
        <div className="avatar">AD</div>
        <div><b>Administrator</b><small>Campus portal</small></div>
      </div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)}/>}

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
        <div><span className="eyebrow">RFID CAMPUS</span><h1>{nav.find(item => item[0] === page)?.[1]}</h1></div>
        <button
          type="button"
          className={`refresh-btn ${refreshing ? "loading" : ""}`}
          onClick={refresh}
          disabled={refreshing}
          aria-label={refreshing ? "Refreshing data" : "Refresh dashboard data"}
          title="Refresh data"
        >
          <RefreshCw size={15}/><span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </header>

      {error && <div className="alert error">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="alert success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {page === "dashboard" && <Dashboard dashboard={dashboard} students={students} attendance={attendance} setPage={navigate}/>}

      {page === "students" && <section className="content-grid">
        <div className="panel form-panel">
          <div className="panel-heading">
            <div><h2>Register student</h2><p>Assign a unique RFID card UID</p></div>
            {registrationMode
              ? <button className="secondary-btn" onClick={cancelRegistration}>Cancel scan</button>
              : <button className="primary-btn compact" onClick={startRegistration}><ScanLine size={15}/>Scan card</button>}
          </div>
          {registrationMode && <div className="scan-status">
            <ScanLine size={24}/>
            <div><b>{pendingUid ? "Card detected" : "Waiting for card..."}</b>
              <small>{pendingUid || "Tap the RFID card on the RC522 reader"}</small></div>
          </div>}
          <form onSubmit={saveStudent}>
            <label>Full name<input name="full_name" required placeholder="Student full name"/></label>
            <label>RFID UID / Student ID<input name="student_id" required value={pendingUid} readOnly={registrationMode} placeholder="Scan or enter UID"/></label>
            <div className="form-row">
              <label>Class<select name="class_id" required defaultValue=""><option value="" disabled>Select class</option>{classes.map(item => <option value={item.id} key={item.id}>{item.class_name}</option>)}</select></label>
              <label>Gender<select name="gender" defaultValue=""><option value="">Not specified</option><option>Female</option><option>Male</option></select></label>
            </div>
            <div className="form-row">
              <label>Phone<input name="phone" placeholder="+250..."/></label>
              <label>Email<input name="email" type="email" placeholder="student@example.com"/></label>
            </div>
            <button className="primary-btn" type="submit"><Plus size={15}/>Register student</button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div><h2>Student management</h2><p>{filteredStudents.length} matching students</p></div>
          </div>
          <div className="filters">
            <div className="search-box"><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or student ID"/></div>
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value); }}><option value="">All classes</option>{classes.map(item => <option value={item.id} key={item.id}>{item.class_name}</option>)}</select>
          </div>
          <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>RFID UID</th><th>CLASS</th><th>STATUS</th><th></th></tr></thead><tbody>
            {filteredStudents.map(student => <tr key={student.id}>
              <td><b>{student.full_name}</b><small className="cell-sub">{formatDate(student.registration_date)}</small></td>
              <td><code>{student.student_id}</code></td>
              <td>{student.class_name || classes.find(item => item.id === student.class_id)?.class_name || "—"}</td>
              <td><span className={`status ${student.active_status === false ? "inactive" : "active"}`}>{student.active_status === false ? "Inactive" : "Active"}</span></td>
              <td>{student.active_status !== false && <button className="icon-btn" title="Deactivate student" onClick={() => deactivateStudent(student.id)}><ToggleLeft size={16}/></button>}</td>
            </tr>)}
          </tbody></table></div>
          {!filteredStudents.length && <div className="empty-state">No students found.</div>}
        </div>
      </section>}

      {page === "attendance" && <section className="panel">
        <div className="panel-heading"><div><h2>Attendance monitoring</h2><p>Live records confirmed by the backend</p></div></div>
        <div className="filters attendance-filters">
          <input type="date" value={attendanceDate} onChange={e => { setAttendanceDate(e.target.value); loadAttendanceFilters(e.target.value, classFilter); }}/>
          <select value={classFilter} onChange={e => { setClassFilter(e.target.value); loadAttendanceFilters(attendanceDate, e.target.value); }}><option value="">All classes</option>{classes.map(item => <option value={item.id} key={item.id}>{item.class_name}</option>)}</select>
          <button className="secondary-btn" onClick={() => loadAttendanceFilters()}><RefreshCw size={14}/>Apply</button>
        </div>
        <form className="filters attendance-filters" onSubmit={postAttendance}>
          <select value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} required>
            <option value="" disabled>Select student</option>
            {students.filter(student => student.active_status !== false).map(student =>
              <option value={student.student_id} key={student.id}>{student.full_name}</option>
            )}
          </select>
          <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required/>
          <button className="primary-btn compact" type="submit"><Plus size={14}/>Post attendance</button>
        </form>
        <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>RFID UID</th><th>DATE</th><th>TIME</th><th>STATUS</th><th></th></tr></thead><tbody>
          {attendance.map(record => <tr key={record.id}>
            <td><b>{record.full_name || record.students?.full_name || "Student"}</b></td>
            <td><code>{record.student_id}</code></td>
            <td>{formatDate(record.attendance_date)}</td>
            <td>{record.attendance_time}</td>
            <td><span className="status active">{record.status}</span></td>
            <td><button className="icon-btn" title="Delete attendance record" onClick={() => deleteAttendanceRecord(record.id)}><Trash2 size={16}/></button></td>
          </tr>)}
        </tbody></table></div>
        {!attendance.length && <div className="empty-state">No attendance records match these filters.</div>}
      </section>}

      {page === "reports" && <section className="panel">
        <div className="panel-heading"><div><h2>Attendance reports</h2><p>Daily summaries and individual attendance history</p></div></div>
        <div className="filters attendance-filters">
          <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} onChange={e => loadDailyReport(e.target.value)}/>
          <button className="secondary-btn" onClick={() => loadDailyReport(document.querySelector('input[type="date"]')?.value)}><FileChartColumn size={14}/>Generate</button>
        </div>
        {report ? <div>
          <div className="stats-grid report-grid">
            <Stat label="Total students" value={report.totalStudents}/>
            <Stat label="Present" value={report.present}/>
            <Stat label="Absent" value={report.absent}/>
            <Stat label="Attendance" value={`${report.percentage}%`}/>
          </div>
          <div className="table-wrap report-table"><table><thead><tr><th>STUDENT</th><th>RFID UID</th><th>TIME</th><th>STATUS</th></tr></thead><tbody>
            {report.records.map(record => <tr key={record.id}><td><b>{record.full_name || record.students?.full_name || "Student"}</b></td><td><code>{record.student_id}</code></td><td>{record.attendance_time}</td><td><span className="status active">{record.status}</span></td></tr>)}
          </tbody></table></div>
        </div> : <div className="empty-state">Choose a date and generate a report.</div>}
      </section>}
    </main>
  </div>;
}

function Dashboard({ dashboard, students, attendance, setPage }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = attendance.filter(record => record.attendance_date === today);
  return <div className="dashboard-content">
    <div className="welcome-row"><div><h2>Attendance overview</h2><p>Live data from the RFID database</p></div><span className="date-chip">{today}</span></div>
    <div className="stats-grid">
      <Stat label="Registered students" value={dashboard?.totalStudents ?? students.length}/>
      <Stat label="Attendance today" value={dashboard?.attendanceToday ?? todayRecords.length}/>
      <Stat label="Present" value={dashboard?.present ?? todayRecords.length}/>
      <Stat label="Absent" value={dashboard?.absent ?? 0}/>
    </div>
    <section className="dashboard-lower">
      <div className="panel"><div className="panel-heading"><div><h2>Recent attendance</h2><p>Latest scans accepted by the backend</p></div><button className="text-btn" onClick={() => setPage("attendance")}>View all</button></div>
        <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>RFID UID</th><th>TIME</th><th>STATUS</th></tr></thead><tbody>{todayRecords.slice(-8).reverse().map(record => <tr key={record.id}><td><b>{record.full_name || record.students?.full_name || "Student"}</b></td><td><code>{record.student_id}</code></td><td>{record.attendance_time}</td><td><span className="status active">{record.status}</span></td></tr>)}</tbody></table></div>
      </div>
      <div className="panel"><div className="panel-heading"><div><h2>Attendance rate</h2><p>Current attendance percentage</p></div></div><div className="rate-ring" style={{"--rate": `${dashboard?.attendancePercentage ?? 0}%`}}><div><b>{dashboard?.attendancePercentage ?? 0}%</b><span>Today</span></div></div></div>
    </section>
  </div>;
}

function Stat({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;
}
