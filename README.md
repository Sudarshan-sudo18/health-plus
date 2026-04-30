# Health Plus Full-Stack Prototype

Health Plus now uses MongoDB-backed authentication with bcrypt password hashing and JWT access tokens.

```text
/backend
  /config
  /data
  /middleware
  /models
  /routes
  package.json
  server.js

/frontend
  /assets
  /auth
  /components
  /pages
    /admin
    /doctor
    /patient
  /services
  app.js
  index.html
  router.js
  styles.css
```

## Backend

Stack: Node.js, Express, MongoDB, Mongoose, bcrypt, JWT.

Auth routes:

```text
POST /auth/register
POST /auth/login
GET /me
```

Protected role routes:

```text
GET /admin
PATCH /admin/appointments/:id/status
GET /doctor
PATCH /doctor/appointments/:id/status
GET /patient
POST /patient/appointments
```

Protected requests require:

```text
Authorization: Bearer <accessToken>
```

## Environment

Create `backend/.env` from `backend/.env.example`:

```text
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
MONGO_URI=mongodb://127.0.0.1:27017/healthplus
CLIENT_ORIGIN=http://localhost:3000
```

## Run Locally

Make sure MongoDB is running, then install backend dependencies:

```powershell
npm run install:backend
```

Start the API and frontend static server:

```powershell
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Authentication Flow

1. Create an account at `/signup`.
2. Log in at `/login`.
3. The backend returns a JWT access token.
4. The frontend stores the token in `localStorage`.
5. Protected dashboard API calls attach the token automatically.
6. Unauthorized access redirects to `/login`.

## Notes

- Users are stored in MongoDB and persist after server restart.
- Passwords are hashed with bcrypt before being saved.
- Demo users and hardcoded credentials were removed from the UI and backend auth.
- Temporary doctor, appointment, prescription, and report data still uses the simple seed store until a full database schema is added for those domains.
