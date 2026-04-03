# Doctor Dashboard (DocDash)

Responsive doctor cockpit built with React + Vite. The dashboard includes onboarding, availability planning, patient scheduling, case details, and medicine allocation with clean API integration points.

## Getting started

```bash
cd /Users/swastimohanty/Documents/Desktop/Scheduler/doc-dash
npm install
npm run dev
```

Open http://localhost:5173 to interact with the dashboard.

## Environment configuration

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Base URL for backend services | `/api` |

Create a `.env` file (same folder as `package.json`) to override the defaults:

```
VITE_API_URL=http://localhost:4000
```

## API contract

The UI ships with optimistic fallbacks but expects these REST endpoints once the backend is ready:

| Feature | Method & path | Payload / response |
| --- | --- | --- |
| Doctor onboarding | `GET /doctors/current` | `{ name, location, services, specialty, availableTime }` |
|  | `POST /doctors` | Body identical to response above |
| Appointments | `GET /appointments` | `[{ id, patientName, start, end, type, channel, notes }]` |
| Availability slots | `GET /availability` | `[{ id, start, end, note }]` |
|  | `POST /availability` | Create slot body |
|  | `PATCH /availability/:id` | `{ id, start, end, note }` |
|  | `DELETE /availability/:id` | – |
| Patient details | `GET /patients` | `[{ id, name, age, gender, history[], currentCase, allergies, priority }]` |
| Medicine allocation | `GET /medicines` | `[{ id, patientId, patientName, medicine, dosage, schedule, status }]` |
|  | `POST /medicines` | `{ patientId, medicine, dosage, schedule }` |

All endpoints should return JSON. The UI already handles optimistic updates and surfaces errors if the network is unavailable, so backend handlers can focus on persistence and validation.

## UI modules

- **Doctor onboarding form** – validates inputs, shows inline errors, and posts to `/doctors`.
- **Calendar (React Big Calendar)** – add/edit/delete availability slots with instant feedback.
- **Patient schedule** – sorted appointment list with detail preview.
- **Patient details** – cards summarising medical history and case data.
- **Medicine allocation** – assign medicines per patient and track completion status.

## Tech stack

- React 19 + hooks
- Vite tooling
- `react-big-calendar` with `date-fns` localiser
- Modern CSS (no external framework) tuned for subtle blues/greys palette

Feel free to extend the panels or connect real-time updates once the backend APIs are live.
