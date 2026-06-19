import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/api.js";
import { oauthRouter } from "./routes/oauth.js";

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.options(/.*/, cors({ origin: true }));
  app.use(express.json());

  /** Strip /api prefix when invoked via Firebase Hosting rewrite */
  app.use((req, _res, next) => {
    if (req.url.startsWith("/api")) {
      req.url = req.url.slice(4) || "/";
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      authEmulator: process.env.FIREBASE_AUTH_EMULATOR_HOST,
      projectId: process.env.GCLOUD_PROJECT,
    });
  });

  app.use("/oauth", oauthRouter);
  app.use("/", apiRouter);

  return app;
}
