import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

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
  const isHelpActive = location.hash === "#/napoveda" || location.pathname === "/napoveda";
  const year = new Date().getFullYear();

  useEffect(() => {
    const syncAdmin = () => {
      try {
        const active = typeof localStorage !== "undefined" && localStorage.getItem("ktf_admin_session") === "active";
        setLocalAdmin(active);
      } catch (err) {
        setLocalAdmin(false);
      }
    };
    window.addEventListener("ktf-admin-refresh", syncAdmin);
    window.addEventListener("storage", syncAdmin);
    return () => {
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

  const triggerAdminLogout = () => {
    if (onAdminLogout) {
      onAdminLogout();
      return;
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

  const handleLocalLoginSubmit = () => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (localPassword === adminPassword) {
      try {
        localStorage.setItem("ktf_admin_session", "active");
      } catch (err) {
        // Ignoruj chyby práce s úložištěm
      }
      setLocalAdmin(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktf-admin-refresh"));
      }
      setShowLocalLogin(false);
      setLocalPassword("");
    } else {
      alert("Nesprávné heslo");
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
    <a
      href="#/napoveda"
      className={`footer-link footer-link-help${isHelpActive ? " footer-link-current" : ""}`}
    >
      Nápověda
    </a>
  );

  return (
    <>
      <footer className="footer">
        <div className="footer-inner">
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
