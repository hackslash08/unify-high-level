#!/usr/bin/env node
/**
 * Share local dev with external testers via ngrok.
 * - Vite UI on :5180 (dedicated share port, strict)
 * - ngrok tunnels to that port
 * - Functions emulator only (production Auth + Firestore on server)
 * - Client uses production Firebase Auth (no emulators)
 */
import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const projectId = "test-project-5ed42";
const vitePort = 5180;
const functionsEnvPath = join(root, "functions", ".env");

const LOCAL_ENV = {
  APP_URL: "http://localhost:5173",
  FUNCTIONS_URL: `http://127.0.0.1:5001/${projectId}/us-central1/api`,
  HL_REDIRECT_URI: `http://127.0.0.1:5001/${projectId}/us-central1/api/oauth/hl/callback`,
  GOOGLE_REDIRECT_URI: `http://127.0.0.1:5001/${projectId}/us-central1/api/oauth/connector/google-contacts/callback`,
};

const children = [];
let restored = false;

function log(msg) {
  console.log(`\n[share-dev] ${msg}`);
}

function spawnProc(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd ?? root,
    shell: true,
    stdio: opts.stdio ?? "inherit",
    env: { ...process.env, ...opts.env },
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[share-dev] ${label} exited with code ${code}`);
    }
  });
  children.push({ label, child });
  return child;
}

function killAll() {
  for (const { label, child } of children) {
    if (!child.killed) {
      log(`Stopping ${label}...`);
      child.kill("SIGTERM");
    }
  }
}

function patchFunctionsEnv(overrides) {
  if (!existsSync(functionsEnvPath)) {
    throw new Error(`Missing ${functionsEnvPath} — copy from functions/.env.example`);
  }
  let env = readFileSync(functionsEnvPath, "utf8");
  for (const [key, value] of Object.entries(overrides)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    env = re.test(env) ? env.replace(re, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
  }
  writeFileSync(functionsEnvPath, env);
}

function restoreLocalEnv() {
  if (restored) return;
  restored = true;
  try {
    patchFunctionsEnv(LOCAL_ENV);
    log("Restored functions/.env to local URLs");
  } catch (err) {
    console.error("[share-dev] Failed to restore functions/.env:", err.message);
  }
}

async function waitForVite(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForFunctionsHealth(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.status === 200) {
        const body = await res.json();
        if (body?.status === "ok") return;
      }
    } catch {
      /* emulator still loading */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(
    `Functions API not ready at ${url}. Check terminal for "Failed to load function definition".`
  );
}

async function getNgrokUrl(timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      const data = await res.json();
      const tunnel = data.tunnels?.find((t) => t.proto === "https");
      if (tunnel?.public_url) {
        return tunnel.public_url.replace(/\/$/, "");
      }
    } catch {
      /* ngrok API not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Could not read ngrok public URL (is ngrok running?)");
}

async function main() {
  log("Building shared packages...");
  execSync(
    "pnpm --filter @highlevel/shared build && pnpm --filter @highlevel/connectors build && pnpm --filter @highlevel/functions build",
    { cwd: root, stdio: "inherit", shell: true }
  );

  log(`Starting Vite on port ${vitePort} (production Firebase for remote login)...`);
  spawnProc("vite", "pnpm", ["--filter", "@highlevel/web", "dev:share"], {
    env: {
      VITE_SHARE_MODE: "true",
      VITE_USE_FIREBASE_EMULATORS: "false",
    },
  });

  await waitForVite(`http://127.0.0.1:${vitePort}`);

  log(`Starting ngrok tunnel to :${vitePort}...`);
  spawnProc("ngrok", "ngrok", ["http", String(vitePort), "--log=stdout"], {
    stdio: "pipe",
  });

  const publicUrl = await getNgrokUrl();
  log(`Public URL: ${publicUrl}`);

  patchFunctionsEnv({
    APP_URL: publicUrl,
    FUNCTIONS_URL: `${publicUrl}/api`,
    HL_REDIRECT_URI: `${publicUrl}/api/oauth/hl/callback`,
    GOOGLE_REDIRECT_URI: `${publicUrl}/api/oauth/connector/google-contacts/callback`,
  });
  log("Updated functions/.env with ngrok URLs");

  log("Starting Functions emulator (no Emulator UI — production Auth + Firestore)...");
  const emulatorEnv = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: "60" };
  delete emulatorEnv.FIREBASE_AUTH_EMULATOR_HOST;
  delete emulatorEnv.FIRESTORE_EMULATOR_HOST;
  spawnProc(
    "emulators",
    "firebase",
    ["emulators:start", "--only", "functions", "--config", "firebase.share.json"],
    { env: emulatorEnv }
  );

  const healthUrl = `http://127.0.0.1:5001/${projectId}/us-central1/api/health`;
  log("Waiting for Functions API to load (can take up to 60s)...");
  await waitForFunctionsHealth(healthUrl);

  const ngrokHost = new URL(publicUrl).hostname;

  console.log(`
================================================================================
  SHARE LINK (send to testers):  ${publicUrl}

  Remote login checklist (required on the OTHER computer):
  1. Firebase Console → Authentication → Sign-in method → enable Email/Password
  2. Firebase Console → Authentication → Settings → Authorized domains
     → Add: ${ngrokHost}
  3. Use Sign UP to create a NEW account (local emulator accounts won't work)
  4. On ngrok's "Visit Site" interstitial page, click through to continue

  HighLevel redirect URL:
    ${publicUrl}/api/oauth/hl/callback

  ngrok inspector: http://127.0.0.1:4040
  Press Ctrl+C to stop all services and restore local env URLs.
================================================================================
`);
}

process.on("SIGINT", () => {
  killAll();
  restoreLocalEnv();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAll();
  restoreLocalEnv();
  process.exit(0);
});

main().catch((err) => {
  console.error("[share-dev] Failed:", err.message);
  killAll();
  restoreLocalEnv();
  process.exit(1);
});
