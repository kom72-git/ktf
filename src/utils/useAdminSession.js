import { useEffect, useState } from "react";
import { apiFetch, getApiBase } from "../apiBase.js";

// Zjistí, zda je správce přihlášen (cookie session ověřená serverem); reaguje i na přihlášení/odhlášení bez F5.
export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = () => {
      apiFetch(`${getApiBase()}/api/auth/session`)
        .then((r) => (r.ok ? r.json() : null))
        .then((session) => alive && setIsAdmin(Boolean(session?.authenticated)))
        .catch(() => alive && setIsAdmin(false));
    };
    check();
    window.addEventListener("ktf-admin-refresh", check);
    return () => {
      alive = false;
      window.removeEventListener("ktf-admin-refresh", check);
    };
  }, []);
  return isAdmin;
}
