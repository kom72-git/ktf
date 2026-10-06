import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch, getApiBase } from "./apiBase.js";
import "./FooterExperimental.css";

// Přepínač: true = nová patička, false = původní (stačí přepsat a hotovo).
const USE_EXPERIMENTAL_FOOTER = true;

export default function Footer({ isAdmin, onAdminLogin, onAdminLogout }) {
  const [localAdmin, setLocalAdmin] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem("ktf_admin_session") === "active";
    } catch (err) {
      return false;
    }
  });
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [localPassword, setLocalPassword] = useState("");
  const passwordInputRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const isHelpActive = currentPath === "/napoveda";
  const isChecklistActive = currentPath === "/chybenka";
  // Po přechodu přes odkaz v patičce se stránka zobrazí od začátku.
  const scrollToTop = () => window.scrollTo({ top: 0 });
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    const syncAdmin = async () => {
      try {
        const response = await apiFetch(`${getApiBase()}/api/auth/session`);
        if (cancelled) return;
        setLocalAdmin(response.ok);
      } catch (error) {
        if (!cancelled) {
          console.error("Ověření admin session se nezdařilo:", error);
          setLocalAdmin(false);
        }
      }
    };
    window.addEventListener("ktf-admin-refresh", syncAdmin);
    window.addEventListener("storage", syncAdmin);
    syncAdmin();
    return () => {
      cancelled = true;
      window.removeEventListener("ktf-admin-refresh", syncAdmin);
      window.removeEventListener("storage", syncAdmin);
    };
  }, []);

  useEffect(() => {
    if (showLocalLogin && passwordInputRef.current) {
      passwordInputRef.current.focus();
      passwordInputRef.current.select();
    }
  }, [showLocalLogin]);

  const adminActive = typeof isAdmin === "boolean" ? isAdmin : localAdmin;

  useEffect(() => {
    if (adminActive) {
      setShowLocalLogin(false);
      setLocalPassword("");
    }
  }, [adminActive]);

  useEffect(() => {
    if (!showLocalLogin) return;
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowLocalLogin(false);
        setLocalPassword("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLocalLogin]);

  const triggerAdminLogin = () => {
    if (onAdminLogin) {
      onAdminLogin();
      return;
    }
    if (!adminActive) {
      setLocalPassword("");
      setShowLocalLogin(true);
    }
  };

  const triggerAdminLogout = async () => {
    if (onAdminLogout) {
      onAdminLogout();
      return;
    }
    try {
      const response = await apiFetch(`${getApiBase()}/api/auth/logout`, { method: "POST" });
      if (!response.ok) throw new Error(`Logout request failed (${response.status})`);
    } catch (error) {
      console.error("Odhlášení správce se nezdařilo:", error);
      alert("Server odhlášení nepotvrdil. Zkus to prosím znovu.");
    }
    try {
      localStorage.removeItem("ktf_admin_session");
    } catch (err) {
      // ignore
    }
    setLocalAdmin(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ktf-admin-refresh"));
    }
  };

  const handleLocalLoginSubmit = async () => {
    try {
      const response = await apiFetch(`${getApiBase()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: localPassword }),
      });
      if (!response.ok) {
        alert(response.status === 503
          ? "Přihlášení správce není na serveru nastavené."
          : "Nesprávné heslo");
        return;
      }
      localStorage.setItem("ktf_admin_session", "active");
      setLocalAdmin(true);
      window.dispatchEvent(new Event("ktf-admin-refresh"));
      setShowLocalLogin(false);
      setLocalPassword("");
    } catch (error) {
      console.error("Přihlášení správce se nezdařilo:", error);
      alert("Přihlášení se nepodařilo. Zkontroluj připojení k serveru.");
    }
  };

  const handleLocalLoginCancel = () => {
    setShowLocalLogin(false);
    setLocalPassword("");
  };

  const contactLink = (
    <a
      href="#"
      className="footer-link footer-link-disabled"
      title="Připravujeme"
      onClick={e => e.preventDefault()}
    >
      Kontakt
    </a>
  );

  const helpLink = (
    <Link
      to="/napoveda"
      className={`footer-link footer-link-help${isHelpActive ? " footer-link-current" : ""}`}
      aria-current={isHelpActive ? "page" : undefined}
      onClick={scrollToTop}
    >
      Nápověda
    </Link>
  );

  return (
    <>
      <footer className={USE_EXPERIMENTAL_FOOTER ? "footer footer-v2" : "footer"}>
        <div className="footer-inner">
          {USE_EXPERIMENTAL_FOOTER ? (
            <span className="footer-v2-brand">
              <img src="/img/logo.svg" alt="" className="footer-v2-logo" />
              <span className="footer-v2-title">
                <strong>Filatelium</strong>
                <small>Studium tiskových forem, desek a polí</small>
              </span>
            </span>
          ) : null}
          <span className="footer-brand">kom72 © {year}</span>
          {!adminActive ? (
            <>
              <span className="footer-divider">|</span>
              <a
                href="#"
                className="footer-link footer-link-admin"
                onClick={e => {
                  e.preventDefault();
                  triggerAdminLogin();
                }}
              >
                admin
              </a>
              <span className="footer-divider">|</span>
              {contactLink}
              <span className="footer-divider">|</span>
              {helpLink}
            </>
          ) : (
            <>
              <span className="footer-divider footer-divider-strong">||</span>
              <span className="footer-admin-group">
                <span className="footer-badge">Admin mode</span>
                <span className="footer-divider footer-divider-tight">|</span>
                <a
                  href="https://github.com/kom72/ktf"
                  className="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <span className="footer-divider footer-divider-tight">|</span>
                <Link
                  to="/chybenka"
                  className={`footer-link${isChecklistActive ? " footer-link-current" : ""}`}
                  aria-current={isChecklistActive ? "page" : undefined}
                  onClick={scrollToTop}
                >
                  Chyběnka
                </Link>
                <span className="footer-divider footer-divider-tight">|</span>
                <a
                  href="#"
                  className="footer-link footer-link-danger"
                  onClick={e => {
                    e.preventDefault();
                    triggerAdminLogout();
                  }}
                >
                  Odhlásit
                </a>
              </span>
              <span className="footer-divider footer-divider-strong">||</span>
              {contactLink}
              <span className="footer-divider">|</span>
              {helpLink}
            </>
          )}
        </div>
      </footer>
      {!onAdminLogin && showLocalLogin && (
        <div
          className="footer-login-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-login-heading"
        >
          <div className="footer-login-modal">
            <h3 id="footer-login-heading" className="footer-login-title">Admin přístup</h3>
            <p className="footer-login-hint">Zadejte heslo správce.</p>
            <input
              ref={passwordInputRef}
              type="password"
              className="footer-login-input"
              value={localPassword}
              onChange={e => setLocalPassword(e.target.value)}
              placeholder="Heslo"
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleLocalLoginSubmit();
                }
              }}
            />
            <div className="footer-login-actions">
              <button
                type="button"
                className="footer-login-cancel"
                onClick={handleLocalLoginCancel}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="footer-login-confirm"
                onClick={handleLocalLoginSubmit}
              >
                Přihlásit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
