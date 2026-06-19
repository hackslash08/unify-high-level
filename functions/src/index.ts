import { onRequest } from "firebase-functions/v2/https";
import type { Express } from "express";
import { createApp } from "./app.js";

/** Lazy-load Express app so Functions emulator discovery finishes within timeout */
let app: Express | undefined;

function getApp(): Express {
  if (!app) {
    app = createApp();
  }
  return app;
}

export const api = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  (req, res) => getApp()(req, res)
);
