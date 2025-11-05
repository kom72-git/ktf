import React from "react";

export default function Footer({ isAdmin, onAdminLogin, onAdminLogout }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        © {new Date().getFullYear()} kom72
        {!isAdmin ? (
          <>
            &nbsp;|&nbsp;
            <a href="#" onClick={e => { e.preventDefault(); onAdminLogin && onAdminLogin(); }} style={{color: 'inherit', textDecoration: 'none'}}>
              admin
            </a>
            &nbsp;|&nbsp;
            <a href="#" style={{color: 'inherit', textDecoration: 'none', opacity: 0.7, cursor: 'not-allowed'}} title="Připravujeme">Kontakt</a>
            &nbsp;|&nbsp;
            <a href="#/napoveda" style={{color: '#2563eb', textDecoration: 'underline', fontWeight: 500}}>Nápověda</a>
          </>
        ) : (
          <>
            &nbsp;|&nbsp;
            <span style={{color: '#10b981'}}>Admin mode</span>
            &nbsp;|&nbsp;
            <a href="https://github.com/kom72/ktf" target="_blank" rel="noopener noreferrer">GitHub</a>
            &nbsp;|&nbsp;
            <a href="#" onClick={e => { e.preventDefault(); onAdminLogout && onAdminLogout(); }} style={{color: '#ef4444', textDecoration: 'none'}}>
              Odhlásit
            </a>
          </>
        )}
      </div>
    </footer>
  );
}
