import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import VariantTooltip from "./components/VariantTooltip.jsx";

export default function Help() {
  const navigate = useNavigate();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Nápověda | Katalog TF";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block help-page" aria-labelledby="help-page-title">
          <div className="help-top">
            <div className="help-top-copy">
              <div className="detail-title help-main-title-wrap">
                <h2 className="detail-title-text">O webu</h2>
              </div>

              <p className="help-lead">
                Všechny studie rozlišení tiskových forem československých známek přehledně na jednom místě.
                Účelem je zachovat práci autorů studií bez zbytečných zásahů do jejich obsahu.
              </p>
              <p className="help-lead help-lead-secondary">
                Web má usnadnit orientaci v materiálech, které by jinak bylo potřeba dohledávat jednotlivě na různých místech internetu,
                ve zpravodajích nebo ve starších časopisech. Místo roztříštěného hledání nabízí souvislý přehled, na který je možné se
                vracet při běžném prohlížení i podrobnějším studiu.
              </p>
            </div>

            <aside className="help-top-art" aria-hidden="true">
              <div className="help-banner-frame">
                <img
                  src="/img/banner1.png"
                  alt=""
                  className="help-banner"
                />
              </div>
            </aside>
          </div>

          <div className="help-section-intro">
            <div className="detail-title help-main-title-wrap">
              <h1 id="help-page-title" className="detail-title-text">Nápověda</h1>
            </div>
            <p className="help-section-intro-text">
              Základní přehled ovládání webu, vyhledávání a práce s detailem známky i variantami.
            </p>
          </div>

          <div className="help-grid">
            <section className="help-card">
              <h2 className="help-card-title">Jak začít</h2>
              <ul className="help-list">
                <li>Na hlavní stránce je výchozí řazení od nejnovějších, tedy naposledy vložené emise a známky v databázi se zobrazují na prvním místě.</li>
                <li>Výchozí zobrazení je <strong>12 emisí na stránku</strong>, počet lze změnit v pravé části nad katalogem.</li>
                <li>
                  Známky v rámci emisí se sdružují do boxů. Jednotlivý box rozbalíš tlačítkem
                  <span className="help-ui-sample" aria-hidden="true">
                    <button type="button" className="stamp-box-toggle" disabled>+</button>
                  </span>{" "}
                  nebo všechny najednou tlačítkem
                  <span className="help-ui-sample" aria-hidden="true">
                    <button type="button" className="count-control-toggle" disabled>
                      <svg className="count-control-diag-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M10 14 L5 19" />
                        <path d="M5 19 L9 19" />
                        <path d="M5 19 L5 15" />
                        <path d="M14 10 L19 5" />
                        <path d="M19 5 L15 5" />
                        <path d="M19 5 L19 9" />
                      </svg>
                    </button>
                  </span>
                </li>
                <li>Řazení boxů lze přepnout na řazení dle emise, katalogového čísla nebo ponechat výchozí režim nové.</li>
                <li>Kliknutí na logo v hlavičce tě vždy vrátí na hlavní stránku katalogu.</li>
              </ul>
            </section>

            <section className="help-card">
              <h2 className="help-card-title">Vyhledávání a filtry</h2>
              <ul className="help-list">
                <li>Pro rychlé nalezení konkrétní položky použij pole Vyhledat.</li>
                <li>Ve filtrech můžeš samostatně vybírat podle Roku vydání, Názvu emise a Katalogového čísla.</li>
                <li>Filtry je možné mezi sebou kombinovat.</li>
                <li>Prohlížeč si pamatuje naposledy zvolený počet zobrazených emisí a způsob řazení boxů. Aktivní filtry ani pole Vyhledat se neukládají.</li>
                <li>
                  Všechny aktivní filtry a hledání vrátíš tlačítkem
                  <span className="help-ui-sample" aria-hidden="true">
                    <button type="button" className="help-clear-sample" disabled>Vyčistit</button>
                  </span>
                </li>
              </ul>
            </section>

            <section className="help-card">
              <h2 className="help-card-title">Detail známky</h2>
              <ul className="help-list">
                <li>V detailu najdeš hlavní obrázek studie a základní přehled informací ke konkrétní známce.</li>
                <li>
                  U aršíků se často objevují dvě možné varianty katalogového čísla (zoubkovaný a nezoubkovaný), například:
                  <span className="help-catalog-preview" aria-label="Ukázka řádku katalogového čísla">
                    <span className="help-catalog-preview-label">Katalogové číslo:</span>
                    <span className="help-catalog-preview-value">A 2852A</span>
                    <span className="help-catalog-preview-sep">|</span>
                    <a
                      href="#"
                      className="details-link help-catalog-preview-link"
                      onClick={event => event.preventDefault()}
                    >
                      A 2852B
                    </a>
                  </span>
                </li>
                <li>V hlavním obrázku studie jsou odkazy na výskyt jednotlivých variant, které jsou níže na stránce vypsané.</li>
                <li>V režimu Náhledu obrázků je možné mezi nimi procházet i pomocí šipek na klávesnici.</li>
              </ul>
            </section>

            <section className="help-card">
              <h2 className="help-card-title">Varianty</h2>
              <ul className="help-list">
                <li>V této části je výpis variant a DV včetně doprovodných obrázků a popisů.</li>
                <li><strong>Varianta</strong> je obecné označení pro jednotlivá pole na tiskové formě.</li>
                <li>
                  U aršíků se často objevují varianty katalogového čísla pro zoubkovaný a nezoubkovaný.
                </li>
                <li>Obrázky variant lze po kliknutí zvětšit a přibližovat kolečkem myši.</li>
                <li>Pokud je obrázek varianty černobílý a ohraničený čárkovaně, obvykle jde o výstřižek ze studie.</li>
                <li>
                  V popisu DV jednotlivé varianty se může objevit značka
                  <span className="help-ui-sample">
                    <VariantTooltip tooltip={<span style={{ fontSize: "13px" }}>Ukázka plného popisu DV</span>}>
                      …
                    </VariantTooltip>
                  </span>
                  <br />
                  po najetí myší nebo na mobilu ťapnutím se zobrazí celý popis.
                </li>
              </ul>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
