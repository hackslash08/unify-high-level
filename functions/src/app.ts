import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/api.js";
import { oauthRouter } from "./routes/oauth.js";
import { oauthMockRouter } from "./routes/oauth-mock.js";

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

  /** Strip /api prefix when invoked via Firebase Hosting rewrite or Vite proxy */
  app.use((req, _res, next) => {
    const path = req.url.split("?")[0] ?? req.url;
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    if (path.startsWith("/api")) {
      req.url = (path.slice(4) || "/") + qs;
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
  app.use("/oauth/mock", oauthMockRouter);
  app.use("/", apiRouter);

  return app;
}
