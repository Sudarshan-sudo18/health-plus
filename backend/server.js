import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..", "frontend");
const legacyAssetsPath = path.join(__dirname, "..", "assets");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "health-plus-api" });
});

app.use(express.static(frontendPath));
app.use("/auth", authRouter);
app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.safeUser });
});

app.get(["/", "/login", "/signup", "/admin", "/doctor", "/patient"], (req, res, next) => {
  const wantsHtml = String(req.headers.accept || "").includes("text/html");
  const hasBearer = String(req.headers.authorization || "").startsWith("Bearer ");
  if (wantsHtml && !hasBearer) {
    return res.sendFile(path.join(frontendPath, "index.html"));
  }
  return next();
});

app.use("/", dashboardRouter);

app.use("/assets", express.static(legacyAssetsPath));

app.get(["/", "/login", "/signup", "/admin", "/doctor", "/patient"], (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, req, res, next) => {
  if (error && error.code === 11000) {
    return res.status(409).json({ message: "A record with that unique value already exists." });
  }
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Unexpected server error."
  });
});

await connectDatabase();

app.listen(port, () => {
  console.log(`Health Plus API running at http://localhost:${port}`);
});
