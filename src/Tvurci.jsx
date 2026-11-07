// Seznam všech tvůrců, kteří se vyskytují ve známkách.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ScrollTopButton from "./components/ScrollTopButton.jsx";
import Header from "./Header";
import Footer from "./Footer";
import { apiFetch, getApiBase } from "./apiBase.js";
import { emissionToSlug } from "./utils/katalog.js";
import { autoFoto } from "./utils/tvurciFoto.js";
import { loadAuthors, fotoSrc, splitNames, roleLabel, sortedRoles } from "./components/TvurceJmena.jsx";

const surnameKey = (name) => {
  const parts = String(name).trim().split(/\s+/);
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`;
};

// Písmeno skupiny podle příjmení ("Ch" je v češtině samostatné písmeno)
const groupLetter = (name) => {
  const surname = String(name).trim().split(/\s+/).pop();
  return /^ch/i.test(surname) ? "Ch" : surname.charAt(0).toLocaleUpperCase("cs");
};

function AuthorPhoto({ src }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`authors-list-photo${src && !broken ? "" : " author-pop-photo-empty"}`}>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.5" /><path d="M3 22c0-5 4-8 9-8s9 3 9 8z" /></svg>
      )}
    </span>
  );
}

function AuthorGroup({ group, className = "" }) {
  return (
    <div className={`authors-group${className ? ` ${className}` : ""}`}>
      <h2 id={`pismeno-${group.letter}`} className="authors-group-letter">{group.letter}</h2>
      <ul className="authors-list">
        {group.items.map((author) => (
          <li key={author.slug}>
            <Link to={`/tvurce/${author.slug}`}>
              <AuthorPhoto src={author.card?.foto ? fotoSrc(author.card.foto) : autoFoto(author.name)} />
              <span className="authors-list-name">{author.card?.jmeno || author.name}</span>
              <span className="authors-list-meta">
                {sortedRoles(author.roles).map((role) => `${role === "navrhar" ? "návrh" : roleLabel(role, author.card?.jmeno || author.name)} (${author.roles.get(role)})`).join(", ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Tvurci() {
  const navigate = useNavigate();
  const [stamps, setStamps] = useState(null);
  const [cards, setCards] = useState(null);

  useEffect(() => {
    let alive = true;
    loadAuthors().then((list) => alive && setCards(list));
    apiFetch(`${getApiBase()}/api/stamps`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => alive && setStamps(Array.isArray(list) ? list : []))
      .catch(() => alive && setStamps([]));
    return () => { alive = false; };
  }, []);

  const authors = useMemo(() => {
    if (!stamps || !cards) return null;
    const map = new Map();
    stamps.forEach((stamp) => {
      [["navrhar", stamp.navrh], ["rytec", stamp.rytec]].forEach(([role, value]) => {
        splitNames(value).forEach((name) => {
          const slug = emissionToSlug(name);
          const entry = map.get(slug) || { slug, name, ids: new Set(), roles: new Map() };
          entry.ids.add(stamp.idZnamky);
          entry.roles.set(role, (entry.roles.get(role) || 0) + 1);
          map.set(slug, entry);
        });
      });
    });
    return [...map.values()]
      .map((a) => ({ ...a, card: cards.find((c) => c.slug === a.slug) }))
      .sort((a, b) => surnameKey(a.name).localeCompare(surnameKey(b.name), "cs"));
  }, [stamps, cards]);

  const groups = useMemo(() => {
    const result = [];
    (authors || []).forEach((a) => {
      const letter = groupLetter(a.name);
      const last = result[result.length - 1];
      if (last && last.letter === letter) last.items.push(a);
      else result.push({ letter, items: [a] });
    });
    return result;
  }, [authors]);

  const renderAuthorGroup = (group, className) => (
    <AuthorGroup key={group.letter} group={group} className={className} />
  );

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block author-page" aria-labelledby="authors-title">
          <div className="help-page-intro authors-page-intro">
            <img className="help-page-art" src="/img/tvurci.svg" alt="" aria-hidden="true" />
            <button type="button" className="back-btn" onClick={() => navigate(-1)}>← Zpět</button>
            <div className="authors-index-heading">
              <div className="detail-title">
                <h1 id="authors-title" className="detail-title-text">Tvůrci známek</h1>
              </div>
              <p className="authors-intro-text">
                Přehled návrhářů a rytců československých poštovních známek evidovaných na tomto webu.
              </p>
              {!authors ? (
                <p>Načítám…</p>
              ) : null}
            </div>
            {authors ? (
              <nav className="authors-letters authors-letters-centered" aria-label="Rejstřík podle písmen">
                {groups.map((g) => (
                  <a key={g.letter} href={`#pismeno-${g.letter}`}>{g.letter}</a>
                ))}
              </nav>
            ) : null}
          </div>
          {authors ? (
            <>
              {groups.map((group) => renderAuthorGroup(group))}
            </>
          ) : null}
        </section>
      </main>
      <ScrollTopButton />
      <Footer />
    </div>
  );
}
