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
Local development leaves admin authentication disabled unless credentials are set.

## Deploy frontend and backend on Render

The Render web service serves the React frontend and Express API from one URL.
Supabase provides persistent PostgreSQL storage; the local JSON file is not
suitable for production persistence.

1. Create a Supabase project and run `server/supabase/schema.sql` in its SQL editor.
2. Push this repository to GitHub, then in Render choose **New → Blueprint** and
   connect the repository. Render reads [render.yaml](render.yaml), builds the
   frontend, and starts the API as one web service.
3. During setup, enter `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a strong
   `ADMIN_PASSWORD` of at least 12 characters. Render generates separate
   `AUTH_TOKEN_SECRET` and `DEVICE_API_KEY` values. Keep all secrets in Render;
   never add them to GitHub or the frontend.
4. When the deployment is healthy, open the service's `onrender.com` URL and sign
   in with the configured admin password. The API is served at `/api`; the health
   endpoint is `/api/health`.
5. To connect an ESP32, set `API_HOST` in the firmware to the HTTPS Render URL and
   set `DEVICE_API_KEY` to the generated Render value locally. Do not commit real
   Wi-Fi credentials or device keys.

Production startup fails when required authentication or device credentials are
missing. Admin sessions expire after eight hours; repeated incorrect sign-ins are
rate-limited. Generate random `AUTH_TOKEN_SECRET` and `DEVICE_API_KEY` values, for
example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Set `ADMIN_PASSWORD` separately and do not commit real values.

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

Open [esp32/rfid_attendance/rfid_attendance.ino](esp32/rfid_attendance/rfid_attendance.ino)
in Arduino IDE, choose **ESP32 Dev Module**, install the MFRC522 library by
GithubCommunity, and set Wi-Fi credentials, API URL, and device key locally.
The sketch verifies HTTPS using the ISRG Root X1 certificate and synchronizes
time over NTP before connecting to the hosted API. Never commit real Wi-Fi
credentials or device keys.

## Core API

- `GET /api/dashboard`
- `POST /api/auth/login` (admin password)
- `GET /api/auth/session`
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
Admin API routes require a signed bearer token when authentication is configured.
The ESP32 scan, pending-UID, and device-config routes require `X-Device-Api-Key`
in production.
