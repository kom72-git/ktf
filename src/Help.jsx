import React from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function Help() {
  return (
    <div className="page-bg">
      <Header />
      <main className="main">
        <div className="stamp-detail-block">
          <div className="detail-title">
            <span className="detail-title-text">Nápověda</span>
          </div>
          <div className="stamp-spec stamp-detail-spec-col">
            <div className="stamp-spec-row">
              <span className="stamp-spec-label">Popis</span>
              <span className="stamp-spec-value">
                Tato stránka obsahuje základní informace o používání katalogu tiskových forem.
              </span>
            </div>
            <div className="stamp-spec-row">
              <span className="stamp-spec-label">Jak používat</span>
              <span className="stamp-spec-value">
                <ul style={{margin:0, paddingLeft:'1.2em'}}>
                  <li>Pro vyhledávání známek použijte pole v horní části katalogu.</li>
                  <li>Detail známky zobrazíte kliknutím na její název nebo obrázek.</li>
                  <li>Pokud jste administrátor, můžete přidávat nové známky a upravovat vady.</li>
                  <li>V případě problémů kontaktujte správce projektu na GitHubu.</li>
                </ul>
              </span>
            </div>
            <div className="stamp-spec-row">
              <span className="stamp-spec-label">Kontakt</span>
              <span className="stamp-spec-value">
                Pokud potřebujete další pomoc, napište na <a href="mailto:support@ktf.cz">support@ktf.cz</a>.
              </span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
