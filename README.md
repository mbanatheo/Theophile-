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

## Deploy frontend and backend

Use **Supabase** for persistent PostgreSQL storage, **Render** for the Express API,
and **Vercel** for the React frontend. The local JSON file is not suitable for
production persistence.

1. Create a Supabase project and run `server/supabase/schema.sql` in its SQL editor.
2. In Render, create a Web Service from this GitHub repository with root directory
   `server`, build command `npm install`, and start command `npm start`. Set:
   - `NODE_ENV=production`
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase (server only)
   - `ADMIN_PASSWORD` to a strong password of at least 12 characters
   - `AUTH_TOKEN_SECRET` and `DEVICE_API_KEY` to separate random values of at least
     32 characters each
   - `CORS_ORIGIN` to the exact deployed Vercel origin
3. In Vercel, import the same repository and set root directory to `client`.
   Set `VITE_API_URL` to the Render service origin (without a trailing slash) and
   `VITE_ADMIN_AUTH_ENABLED=true`, then deploy.
4. Sign in using the `ADMIN_PASSWORD` configured in Render. The API does not expose
   a public signup route. Keep the Supabase service-role key only in Render's
   server-side environment variables; never add real secrets to GitHub.
5. To connect an ESP32 to the hosted API, use the HTTPS Render origin for `API_HOST`
   and set its `DEVICE_API_KEY` to the same value configured in Render. Keep real
   Wi-Fi credentials and device keys out of committed firmware.

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
