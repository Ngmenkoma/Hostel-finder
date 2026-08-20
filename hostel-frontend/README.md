# GCTU Hostel Finder — Frontend (HTML / CSS / JS)

Plain HTML, CSS, and vanilla JavaScript frontend for the hostel booking platform. No build step, no framework — open the files directly or serve them with any static server.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Browse/search hostels (home) |
| `hostel.html?id=X` | Hostel details, room list, booking |
| `login.html` | Log in |
| `register.html` | Sign up as student or landlord |
| `bookings.html` | Student's own booking history |
| `dashboard.html` | Landlord dashboard — add hostels/rooms, manage bookings |
| `account.html` | Profile info + log out |

## Folder structure
```
hostel-frontend/
├── css/style.css       # design tokens + all page styles
├── js/
│   ├── config.js        # API_BASE_URL — change this to your deployed API
│   ├── api.js            # fetch wrapper, auth token storage, formatting helpers
│   ├── ui.js              # toast, hostel card renderer, empty states
│   ├── home.js            # index.html logic
│   ├── hostel.js          # hostel.html logic
│   ├── auth.js            # login.html + register.html logic
│   ├── bookings.js        # bookings.html logic
│   └── dashboard.js       # dashboard.html logic
├── index.html
├── hostel.html
├── login.html
├── register.html
├── bookings.html
├── dashboard.html
├── account.html
└── README.md
```

## Connecting to the backend

This frontend expects the backend API from the `hostel-finder-aws` project (Express + RDS + S3). Before testing:

1. Make sure the backend is running (see that project's README) — locally it defaults to `http://localhost:5000`.
2. Open `js/config.js` and confirm `API_BASE_URL` points at it:
   ```js
   const API_BASE_URL = "http://localhost:5000/api";
   ```
3. When you deploy the backend to EC2, update this to your public URL, e.g.:
   ```js
   const API_BASE_URL = "http://<your-ec2-public-ip>/api";
   ```

## Running locally

You can't just double-click the HTML files (fetch calls need a real origin), so serve the folder:

```bash
cd hostel-frontend
python3 -m http.server 8080
```
Then open `http://localhost:8080/index.html` in your browser, with the backend running separately on port 5000.

Or with Node's `http-server`:
```bash
npx http-server -p 8080
```

## Design notes

- **Palette**: Ink Navy (`#16213A`) headers, Campus Gold (`#E8A33D`) primary actions, Leaf Green (`#2F9E68`) for availability, Coral (`#E85D4E`) for alerts/full states, on a cool light background (`#EEF1F6`).
- **Type**: Sora (display/headings), Inter (body text), IBM Plex Mono (prices and distances — numbers read as data).
- **Signature element**: every hostel card shows a walking-time pill (minutes, not just km) — the single fact students actually decide on.
- Mobile-first, single-column "app shell" layout (max-width 480px) with a bottom nav bar, matching the Jumia-style mobile pattern.

## Auth

The frontend stores the JWT and user object in `localStorage` after login/register (`hf_token`, `hf_user`). Every authenticated request in `api.js` automatically attaches `Authorization: Bearer <token>`.
