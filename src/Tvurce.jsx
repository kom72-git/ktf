// Stránka autora (návrhář / rytec): údaje z kolekce "tvurci" a výpis jeho známek.
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { apiFetch, getApiBase } from "./apiBase.js";
import { emissionToSlug } from "./utils/katalog.js";
import { normalizeStampImagePath } from "./utils/obrazekCesta.js";
import { setPageMetadata } from "./utils/seo.js";
import ScrollTopButton from "./components/ScrollTopButton.jsx";
import { renderPopis, parseZdroj } from "./utils/popisTvurce.jsx";
import AuthorForm from "./components/TvurceForm.jsx";
import { useAdminSession } from "./utils/useAdminSession.js";
import { loadAuthors, fotoSrc, autoFoto, Lifespan, roleLabel, sortedRoles } from "./components/TvurceJmena.jsx";

function splitNames(value) {
  return String(value || "")
    .split(/\s*,\s*|\s+a\s+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

export default function Tvurce() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [stamps, setStamps] = useState(null);
  const [authors, setAuthors] = useState(null);
  const [fotoBroken, setFotoBroken] = useState(false);
  const [editing, setEditing] = useState(false);
  const isAdmin = useAdminSession();

  useEffect(() => {
    let alive = true;
    loadAuthors().then((list) => alive && setAuthors(list));
    apiFetch(`${getApiBase()}/api/stamps`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => alive && setStamps(Array.isArray(list) ? list : []))
      .catch(() => alive && setStamps([]));
    return () => { alive = false; };
  }, []);

  const loading = !stamps || !authors;
  const card = authors?.find((a) => a.slug === slug);

  // Role se vždy odvozují ze známek; jméno ze známek, pokud autor nemá kartu
  const mine = [];
  let foundName = card?.jmeno || "";
  const roles = new Map();
  (stamps || []).forEach((st) => {
    const asDesigner = splitNames(st.navrh).find((n) => emissionToSlug(n) === slug);
    const asEngraver = splitNames(st.rytec).find((n) => emissionToSlug(n) === slug);
    if (!asDesigner && !asEngraver) return;
    if (!foundName) foundName = asDesigner || asEngraver;
    if (asDesigner) roles.set("navrhar", (roles.get("navrhar") || 0) + 1);
    if (asEngraver) roles.set("rytec", (roles.get("rytec") || 0) + 1);
    mine.push({ stamp: st, designer: !!asDesigner, engraver: !!asEngraver });
  });
  mine.sort((a, b) => String(a.stamp.idZnamky).localeCompare(String(b.stamp.idZnamky), "cs", { numeric: true }));

  const unknown = !loading && !foundName;
  const name = foundName;
  const fotoUrl = card?.foto ? fotoSrc(card.foto) : name ? autoFoto(name) : "";

  useEffect(() => {
    if (loading) return;
    setPageMetadata({
      title: name ? `${name} – ${sortedRoles(roles).map((r) => roleLabel(r, name)).join(" a ")} známek | Filatelium` : "Autor nenalezen | Filatelium",
      description: name
        ? `${name} – ${sortedRoles(roles).map((r) => roleLabel(r, name)).join(" a ")} československých poštovních známek. ${mine.length} v katalogu.`
        : undefined,
      path: `/tvurce/${slug}`,
      noIndex: unknown,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, name, slug, unknown, mine.length]);

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block author-page" aria-labelledby="author-page-title">
          <div className="button-row">
            <button type="button" className="back-btn" onClick={() => navigate(-1)}>← Zpět</button>
            <Link to="/tvurci" className="back-btn author-all-link">Rytci a návrháři</Link>
            {isAdmin && !loading && !unknown && (
              <>
                <button
                  type="button"
                  className={editing ? "admin-edit-btn primary" : "admin-edit-btn success"}
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? "Odejít" : "Editovat"}
                </button>
                {editing && (
                  <button type="submit" form="author-edit-form" className="ktf-btn-confirm detail-inline-offset">✔ Ulož vše</button>
                )}
              </>
            )}
          </div>
          {loading ? (
            <p>Načítám…</p>
          ) : unknown ? (
            <p>Autor nebyl nalezen.</p>
          ) : (
            <>
              <div className="author-page-head">
                <div className={`author-pop-photo author-page-photo${fotoUrl && !fotoBroken ? "" : " author-pop-photo-empty"}`}>
                  {fotoUrl && !fotoBroken ? (
                    <img src={fotoUrl} alt={name} onError={() => setFotoBroken(true)} />
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.5" /><path d="M3 22c0-5 4-8 9-8s9 3 9 8z" /></svg>
                  )}
                </div>
                <h1 id="author-page-title" className="detail-title-text">{name}</h1>
                <div className="author-pop-role">{sortedRoles(roles).map((r) => roleLabel(r, name)).join(", ")}</div>
                {editing ? (
                  <AuthorForm name={name} author={card} onSaved={(saved) => { setAuthors((list) => [...(list || []).filter((a) => a.slug !== saved.slug), saved]); setEditing(false); setFotoBroken(false); }} />
                ) : (
                  <>
                    <Lifespan author={card} />
                    {card?.popis ? <p className="author-page-text">{renderPopis(card.popis)}</p> : <p className="author-pop-empty">O tomto tvůrci zatím nemáme další informace.</p>}
                    {card?.popis && parseZdroj(card.zdrojUrl) && (
                      <p className="author-page-source">
                        Zdroj: <a href={parseZdroj(card.zdrojUrl).url} target="_blank" rel="noopener noreferrer nofollow">{parseZdroj(card.zdrojUrl).label}</a>
                      </p>
                    )}
                  </>
                )}
              </div>
              <h2>Známky ({mine.length})</h2>
              <ul className="author-stamps">
                {mine.map(({ stamp, designer, engraver }) => (
                  <li key={stamp.idZnamky}>
                    <Link to={`/detail/${stamp.idZnamky}`}>
                      <span className="author-stamps-img">
                        <img src={normalizeStampImagePath(stamp.obrazek, stamp.rok)} alt="" loading="lazy" />
                      </span>
                      <span className="author-stamps-title">{stamp.emise}</span>
                      <span className="author-stamps-meta">
                        {stamp.rok} · {stamp.katalogCislo}
                      </span>
                      <span className="author-stamps-meta author-stamps-role">
                        {[engraver && "rytina", designer && "návrh"].filter(Boolean).join(" + ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="author-stamps-note">Nejedná se o úplný přehled tvorby autora, ale pouze o známky evidované na tomto webu.</p>
            </>
          )}
        </section>
      </main>
      <ScrollTopButton />
      <Footer />
    </div>
  );
}
