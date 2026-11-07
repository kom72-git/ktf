import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import VariantTooltip from "./components/VariantTooltip.jsx";
import CatalogNumberDisplay from "./components/CatalogNumberDisplay.jsx";

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block help-page" aria-labelledby="help-page-title">
          <div className="help-page-intro">
            <img className="help-page-art" src="/img/napoveda.svg" alt="" aria-hidden="true" />
            <button type="button" className="back-btn" onClick={() => navigate(-1)}>← Zpět</button>
            <div className="detail-title help-main-title-wrap">
              <h1 id="help-page-title" className="detail-title-text">Nápověda</h1>
            </div>

            <p className="help-lead">
              Tyto stránky poskytují široké filatelistické veřejnosti seznam o všech studiích, které rozlišují tiskové formy, desky a pole při tisku československých známek v letech 1945–1992.
            </p>
            <p className="help-lead help-lead-secondary">
              Web má usnadnit orientaci v materiálech, které by jinak bylo potřeba dohledávat jednotlivě na různých místech internetu,
              ve zpravodajích nebo ve starších časopisech. Místo roztříštěného hledání nabízí ucelený přehled, který je možný
              využít zejména při podrobnějším studiu a kompletaci vaší specializované sbírky československých známek.
            </p>
          </div>

          <div className="help-section-intro">
            <div className="detail-title help-main-title-wrap">
              <h2 className="detail-title-text">Používání katalogu</h2>
            </div>
            <p className="help-section-intro-text">
              Základní přehled ovládání webu, vyhledávání a práce s detailem známky i variantami.
            </p>
          </div>

          <div className="help-grid">
            <section className="help-card">
              <h2 className="help-card-title">Hlavní stránka</h2>
              <ul className="help-list">
                <li>
                  Známky se v rámci emisí sdružují do boxů. Pro zobrazení jednotlivých známek box rozbalíš tlačítkem
                  <span className="help-ui-sample" aria-hidden="true">
                    <button type="button" className="stamp-box-toggle" disabled>+</button>
                  </span>{" "}
                  nebo všechny najednou pomocí
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
                <li>Jako výchozí řazení se používá zobrazení podle naposledy vložených emisí do databáze. Nejnovější se zobrazí na prvním místě.</li>
                <li>Výchozí výpis je <strong>12 emisí na stránku</strong>, počet lze změnit v pravé části nad katalogem.</li>
                <li>Řazení boxů lze přepnout na řazení dle emise, katalogového čísla nebo ponechat výchozí režim nové.</li>
                <li>Kliknutí na logo v hlavičce tě vždy vrátí na hlavní stránku katalogu.</li>
              </ul>
            </section>

            <section className="help-card">
              <h2 className="help-card-title">Vyhledávání a filtry</h2>
              <ul className="help-list">
                <li>Pro rychlé nalezení konkrétní položky použij pole Vyhledat.</li>
                <li>Ve filtrech můžeš samostatně zobrazovat podle Roku vydání, Názvu emise a Katalogového čísla.</li>
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
                  U aršíků se často objevují dvě možné varianty katalogového čísla (zoubkovaný a nezoubkovaný), například: <CatalogNumberDisplay text="A 2852A" /> | <a
                    href="#"
                    className="details-link"
                    onClick={event => event.preventDefault()}
                  ><CatalogNumberDisplay text="A 2852B" /></a>
                </li>
                <li>V hlavním obrázku studie jsou grafické odkazy na pozici výskytu jednotlivých variant.</li>
                <li>Ty jsou později na stránce jednotlivě vypsané.</li>
                <li>
                  <span className="help-verified-item">
                    <span className="help-verified-sample" role="img" aria-label="Schváleno dne 01.VI.2026">
                      <img src="/img/overeno.svg" alt="" aria-hidden="true" />
                      <span aria-hidden="true">01.VI.2026</span>
                    </span>
                    <span>Razítko „Schváleno“ v pravém horním rohu detailu známky znamená, že obsah odsouhlasil sám autor studie.</span>
                  </span>
                </li>
              </ul>
            </section>

            <section className="help-card">
              <h2 className="help-card-title">Varianty</h2>
              <ul className="help-list">
                <li><strong>Varianta</strong> je obecné označení pro jednotlivá pole tiskové formy.</li>
                <li>Obrázky variant lze v módu prohlížení zvětšovat kolečkem myši. Mezi nimi je možné procházet i pomocí šipek na klávesnici.</li>
                <li>Pokud je obrázek varianty černobílý a ohraničený čárkovaně, obvykle jde o výstřižek ze studie.</li>
                <li>Pokud je ohraničený čárkovaně celý box varianty, jedná se o dodanou variantu nad rámec původní studie.</li>
                <li>
                  V popisu u jednotlivých variant se může objevit značka
                  <span className="help-ui-sample">
                    <VariantTooltip tooltip={<span className="variant-tooltip-content">Ukázka plného popisu DV</span>}>
                      …
                    </VariantTooltip>
                  </span>
                  <br />
                  Pokud na ní najedu myší nebo na ní ťapnu na mobilu, zobrazí se celý popis.
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
