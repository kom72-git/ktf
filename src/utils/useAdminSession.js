import { useEffect, useState } from "react";
import { apiFetch, getApiBase } from "../apiBase.js";

// Zjistí, zda je správce přihlášen (cookie session ověřená serverem).
export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    apiFetch(`${getApiBase()}/api/auth/session`)
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => alive && setIsAdmin(Boolean(session?.authenticated)))
      .catch(() => alive && setIsAdmin(false));
    return () => { alive = false; };
  }, []);
  return isAdmin;
}
