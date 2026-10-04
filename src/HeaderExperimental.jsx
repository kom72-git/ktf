import React from "react";
import "./HeaderExperimental.css";

export default function HeaderExperimental({ navigate }) {
  function goHome(event) {
    if (navigate) {
      event.preventDefault();
      navigate("/");
    }
  }

  return (
    <header className="ktf-header">
      <div className="ktf-header__inner">
        <a className="ktf-header__brand" href="#/" onClick={goHome}>
          <img className="ktf-header__logo" src="/img/logo.svg" alt="" />
          <span className="ktf-header__wordmark">
            <span className="ktf-header__name">Filatelium</span>
            <span className="ktf-header__tagline">
              Studium tiskových forem, desek a polí
              <br />
              československých známek 1945-92
            </span>
          </span>
        </a>
      </div>
    </header>
  );
}