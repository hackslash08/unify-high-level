export const config = {
  hl: {
    clientId: process.env.HL_CLIENT_ID ?? "",
    clientSecret: process.env.HL_CLIENT_SECRET ?? "",
    appId: process.env.HL_APP_ID ?? deriveAppId(process.env.HL_CLIENT_ID ?? ""),
    installUrl: process.env.HL_INSTALL_URL ?? "",
    authorizeUrl:
      process.env.HL_AUTHORIZE_URL ??
      "https://marketplace.gohighlevel.com/oauth/chooselocation",
    tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
    apiBase: "https://services.leadconnectorhq.com",
    redirectUri: process.env.HL_REDIRECT_URI ?? "",
    userType: (process.env.HL_USER_TYPE ?? "Location") as "Location" | "Company",
    scopes:
      process.env.HL_SCOPES ?? "contacts.readonly contacts.write locations.readonly",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  },
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  functionsUrl: process.env.FUNCTIONS_URL ?? "http://127.0.0.1:5001/your-firebase-project-id/us-central1",
};

/** Client ID format: {appId}-{clientKeySuffix} */
function deriveAppId(clientId: string): string {
  const lastDash = clientId.lastIndexOf("-");
  return lastDash > 0 ? clientId.slice(0, lastDash) : clientId;
}
