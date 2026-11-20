# RFID-Based Student Management and Attendance Monitoring System

Full-stack implementation for the SAN TECH practical assignment.

## Software stack

- ESP32 + MFRC522 RFID reader
- React/Vite frontend
- Node.js/Express REST API
- Local JSON database for development or Supabase PostgreSQL

## Run locally

```bash
npm install
npm run install:all
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

The backend uses `server/data/db.json` when Supabase variables are not configured.
For Supabase, run `server/supabase/schema.sql`, set `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in `server/.env`, and keep them out of source control.

## ESP32 wiring

| RC522/LED/Buzzer | ESP32 GPIO |
|---|---|
| RC522 SDA/SS | GPIO 5 |
| RC522 SCK | GPIO 18 |
| RC522 MOSI | GPIO 23 |
| RC522 MISO | GPIO 19 |
| RC522 RST | GPIO 27 |
| RC522 VCC | 3.3 V |
| RC522 GND | GND |
| Green LED (through 220 ohm) | GPIO 12 |
| Red LED (through 220 ohm) | GPIO 14 |
| Buzzer | GPIO 13 |

Open `esp32/rfid_attendance/rfid_attendance.ino`, set the local Wi-Fi credentials
and API IP, and upload it with Arduino IDE. Required library: MFRC522 by GithubCommunity.

## Core API

- `GET /api/dashboard`
- `GET /api/classes`
- `GET /api/students`
- `POST /api/students`
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `GET /api/attendance`
- `POST /api/attendance` (admin-post attendance by RFID UID)
- `DELETE /api/attendance/:id`
- `POST /api/attendance/scan`
- `GET /api/reports/daily`
- `POST /api/registration/start`
- `GET /api/device/config`
- `POST /api/rfid/pending`

Time is stored in UTC ISO timestamps. Deactivation preserves historical attendance
because it changes `active_status` instead of deleting attendance records.
`DELETE /api/students/:id` deactivates a student; `POST /api/students` adds one.
The health endpoint reports the selected database provider (`local_json` or
`supabase`). Supabase-backed requests require valid project credentials in
`server/.env`; without them, development requests use the local JSON database.
