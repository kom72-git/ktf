import { endAdminSession, isAdminAuthConfigured, isAdminRequest, setApiCors, startAdminSession, verifyAdminPassword } from "../_lib/adminAuth.js";

export default function handler(req, res) {
  setApiCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  if (action === "login" && req.method === "POST") {
    if (!isAdminAuthConfigured()) {
      return res.status(503).json({ error: "Admin authentication is not configured" });
    }
    if (!verifyAdminPassword(req.body?.password)) {
      return res.status(401).json({ error: "Nesprávné heslo" });
    }
    try {
      startAdminSession(req, res);
      return res.status(200).json({ authenticated: true });
    } catch (error) {
      console.error("Unable to start admin session:", error);
      return res.status(503).json({ error: "Admin authentication is not configured" });
    }
  }

  if (action === "session" && req.method === "GET") {
    return res.status(isAdminRequest(req) ? 200 : 401).json({ authenticated: isAdminRequest(req) });
  }

  if (action === "logout" && req.method === "POST") {
    endAdminSession(req, res);
    return res.status(200).json({ authenticated: false });
  }

  return res.status(404).json({ error: "Endpoint nenalezen" });
}
