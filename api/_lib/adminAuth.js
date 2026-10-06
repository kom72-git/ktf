import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ktf_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSecrets() {
  return {
    password: process.env.ADMIN_PASSWORD,
    sessionSecret: process.env.ADMIN_SESSION_SECRET,
  };
}

export function isAdminAuthConfigured() {
  const { password, sessionSecret } = getSecrets();
  return Boolean(password) && Boolean(sessionSecret) && sessionSecret.length >= 32;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(expires, secret) {
  return createHmac("sha256", secret).update(String(expires)).digest("base64url");
}

function parseCookies(req) {
  const raw = req.headers?.cookie || "";
  return Object.fromEntries(raw.split(";").map(part => {
    const separator = part.indexOf("=");
    if (separator < 0) return ["", ""];
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

export function isAdminRequest(req) {
  const { sessionSecret } = getSecrets();
  if (!sessionSecret) return false;
  const token = parseCookies(req)[COOKIE_NAME] || "";
  const [expiresText, suppliedSignature, extra] = token.split(".");
  if (!expiresText || !suppliedSignature || extra) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(suppliedSignature, signature(expires, sessionSecret));
}

export function verifyAdminPassword(password) {
  const { password: expected } = getSecrets();
  return Boolean(expected) && safeEqual(password, expected);
}

function cookieOptions(req, maxAge) {
  const secure = req.headers?.["x-forwarded-proto"] === "https"
    || req.socket?.encrypted === true;
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function startAdminSession(req, res) {
  const { sessionSecret } = getSecrets();
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 32 characters");
  }
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = `${expires}.${signature(expires, sessionSecret)}`;
  const secure = req.headers?.["x-forwarded-proto"] === "https" || req.socket?.encrypted === true;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`,
  );
}

export function endAdminSession(req, res) {
  res.setHeader("Set-Cookie", cookieOptions(req, 0));
}

export function setApiCors(req, res) {
  const origin = req.headers?.origin;
  const allowed = origin && (
    /^https?:\/\/(localhost|127\.0\.0\.1):5173$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.app\.github\.dev$/.test(origin)
  );
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
