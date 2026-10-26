// Jména návrhářů a rytců ve výpisu technických údajů.
// U autorů uložených v kolekci "tvurci" se po kliknutí/klepnutí otevře bublinka s fotkou a údaji.
// Správce může autora v bublince vytvořit nebo upravit.
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getApiBase } from "../apiBase.js";
import { emissionToSlug } from "../utils/katalog.js";
import { plainPopis, parseZdroje, renderZdroje } from "../utils/popisTvurce.jsx";
import { autoFoto } from "../utils/tvurciFoto.js";

export { autoFoto };

export const sourceLabel = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

// Zkrácení textu pro bublinu na hranici slova
export const shortText = (text, max = 220) => {
  const t = String(text || "");
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
};

// České ženské příjmení končí na „á" (Podzemná, Nováková-Horská)
export const isFemaleName = (name) => /á$/i.test(String(name || "").trim());

const stampsWord = (n, name) => {
  const female = isFemaleName(name);
  if (n === 1) return female ? "její známce" : "jeho známce";
  return female ? "jejích známkách" : "jeho známkách";
};

const ROLE_LABELS_FEMALE = { navrhar: "návrhářka", rytec: "rytkyně" };
export const roleLabel = (role, name) => (isFemaleName(name) ? ROLE_LABELS_FEMALE : ROLE_LABELS)[role];

// Další označení z karty tvůrce (např. "malíř, grafik")
export const extraLabels = (card) => String(card?.dalsi || "").split(",").map((t) => t.trim()).filter(Boolean);
export const allRoleLabels = (roles, name, card) => [...sortedRoles(roles).map((r) => roleLabel(r, name)), ...extraLabels(card)];

export const ROLE_LABELS = { navrhar: "návrhář", rytec: "rytec" };

// Role seřazené podle četnosti (při shodě návrhář před rytcem)
export function sortedRoles(roleCounts) {
  return Object.keys(ROLE_LABELS)
    .filter((r) => roleCounts.get(r))
    .sort((a, b) => roleCounts.get(b) - roleCounts.get(a));
}

// Seznam autorů se načítá jednou pro celou aplikaci.
let authorsCache = null;
let authorsPromise = null;
const listeners = new Set();

export function loadAuthors() {
  if (authorsCache) return Promise.resolve(authorsCache);
  if (!authorsPromise) {
    authorsPromise = apiFetch(`${getApiBase()}/api/tvurci`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list) => {
        authorsCache = Array.isArray(list) ? list : [];
        return authorsCache;
      });
  }
  return authorsPromise;
}

// Počty známek podle autora (slug -> počet), načtou se jednou
let countsCache = null;
let countsPromise = null;
const countListeners = new Set();

export function loadCounts() {
  if (countsCache) return Promise.resolve(countsCache);
  if (!countsPromise) {
    countsPromise = apiFetch(`${getApiBase()}/api/stamps`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list) => {
        const counts = {};
        (Array.isArray(list) ? list : []).forEach((stamp) => {
          const designers = splitNames(stamp.navrh).map((n) => emissionToSlug(n));
          const engravers = splitNames(stamp.rytec).map((n) => emissionToSlug(n));
          new Set([...designers, ...engravers]).forEach((slug) => {
            const entry = counts[slug] || (counts[slug] = { count: 0, roles: new Map() });
            entry.count += 1;
            if (designers.includes(slug)) entry.roles.set("navrhar", (entry.roles.get("navrhar") || 0) + 1);
            if (engravers.includes(slug)) entry.roles.set("rytec", (entry.roles.get("rytec") || 0) + 1);
          });
        });
        countsCache = counts;
        countListeners.forEach((fn) => fn(counts));
        return counts;
      });
  }
  return countsPromise;
}

function useAuthorCounts() {
  const [counts, setCounts] = useState(countsCache);
  useEffect(() => {
    countListeners.add(setCounts);
    loadCounts();
    return () => countListeners.delete(setCounts);
  }, []);
  return counts;
}

export function splitNames(value) {
  return String(value || "")
    .split(/\s*,\s*|\s+a\s+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

export function upsertCachedAuthor(author) {
  const rest = (authorsCache || []).filter((a) => a.slug !== author.slug);
  authorsCache = [...rest, author];
  listeners.forEach((fn) => fn(authorsCache));
}

function useAuthors() {
  const [authors, setAuthors] = useState(authorsCache || []);
  useEffect(() => {
    let alive = true;
    loadAuthors().then((list) => alive && setAuthors(list));
    listeners.add(setAuthors);
    return () => {
      alive = false;
      listeners.delete(setAuthors);
    };
  }, []);
  return authors;
}

// Cesta bez úvodního lomítka by se hledala relativně k /detail/…
export function fotoSrc(foto) {
  return /^(https?:|\/|data:)/i.test(foto) ? foto : `/${foto}`;
}

// České datum: "4.8.1952" -> "4. 8. 1952" (s nezlomitelnými mezerami); jiný zápis ponechá
export const formatDate = (value) => {
  const v = String(value || "").trim();
  const m = v.match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{3,4})$/);
  return m ? `${Number(m[1])}.\u00a0${Number(m[2])}.\u00a0${m[3]}` : v;
};

export const hasLifespan = (author) => Boolean(author?.narozen || author?.zemrel);

const LifeIcon = ({ type }) => (
  <svg className="author-life-icon" viewBox="0 0 24 24" aria-hidden="true">
    {type === "born" ? (
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    ) : (
      <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z" />
    )}
  </svg>
);

// Narození a úmrtí s ikonami místo znaků * a †
export function Lifespan({ author }) {
  if (!hasLifespan(author)) return null;
  return (
    <div className="author-pop-dates author-life">
      {author.narozen && (
        <span className="author-life-item" title="Narozen">
          <LifeIcon type="born" /><span className="sr-only">Narozen </span>{formatDate(author.narozen)}
        </span>
      )}
      {author.zemrel && (
        <span className="author-life-item" title="Zemřel">
          <LifeIcon type="died" /><span className="sr-only">Zemřel </span>{formatDate(author.zemrel)}
        </span>
      )}
    </div>
  );
}

function AuthorPopover({ name, role, author, onClose }) {
  const counts = useAuthorCounts();
  const ref = useRef(null);
  const fotoUrl = author?.foto ? fotoSrc(author.foto) : autoFoto(name);
  const [fotoBroken, setFotoBroken] = useState(false);

  // Zavření klepnutím mimo bublinku nebo klávesou Esc
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.parentElement.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Bublinka se posune tak, aby nepřetékala přes okraj okna
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.left = "0px";
    const rect = el.getBoundingClientRect();
    const overflow = rect.right - (window.innerWidth - 8);
    if (overflow > 0) el.style.left = `${-overflow}px`;
  }, []);

  const slugLink = emissionToSlug(name);
  const info = counts?.[slugLink];
  const shownRoles = info
    ? allRoleLabels(info.roles, name, author).join(", ")
    : [roleLabel(role, name), ...extraLabels(author)].join(", ");

  return (
    <div className="author-pop" role="dialog" aria-label={name} ref={ref}>
      <div className={`author-pop-photo${fotoUrl && !fotoBroken ? "" : " author-pop-photo-empty"}`}>
        {fotoUrl && !fotoBroken ? <img src={fotoUrl} alt={name} onError={() => setFotoBroken(true)} /> : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.5" />
            <path d="M3 22c0-5 4-8 9-8s9 3 9 8z" />
          </svg>
        )}
      </div>
      <div className="author-pop-info">
        <b><Link className="author-pop-name-link" to={`/tvurce/${emissionToSlug(name)}`}>{name}</Link></b>
        {(
          <>
            <Lifespan author={author} />
            <div className="author-pop-role">{shownRoles}</div>
            {author?.popis ? <p>{shortText(plainPopis(author.popis))}</p> : !author && <p className="author-pop-empty">O tomto tvůrci zatím nemáme další informace.</p>}
            {author?.popis && parseZdroje(author.zdrojUrl).length > 0 && (
              <div className="author-pop-source">
                {parseZdroje(author.zdrojUrl).length > 1 ? "Zdroje" : "Zdroj"}: {renderZdroje(author.zdrojUrl)}
              </div>
            )}
            <div className="author-pop-actions-row">
              {slugLink && (
                <Link className="author-pop-link" to={`/tvurce/${slugLink}`}>
                  {`Více o tvůrci a ${stampsWord(info ? info.count : 2, name)}${info ? ` (${info.count})` : ""} →`}
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuthorName({ name, role, authors }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef(null);
  const slug = emissionToSlug(name);
  const author = authors.find((a) => a.slug === slug);
  const open = hover || pinned;

  const enter = () => {
    clearTimeout(timer.current);
    setHover(true);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(false), 150);
  };
  const close = useCallback(() => {
    clearTimeout(timer.current);
    setHover(false);
    setPinned(false);
  }, []);

  // Myš: klik vede na stránku tvůrce, bublina se ukazuje po najetí.
  // Dotyk: klepnutí otevře bublinu, na stránku se jde odkazem v ní.
  const onNameClick = (e) => {
    if (window.matchMedia("(hover: hover)").matches) return;
    e.preventDefault();
    setPinned((v) => !v);
  };

  return (
    <span className="author-name-wrap" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        to={`/tvurce/${slug}`}
        className={`author-name${author ? "" : " author-name-new"}`}
        aria-expanded={open}
        onClick={onNameClick}
      >
        {name}
      </Link>
      {open && (
        <AuthorPopover name={name} role={role} author={author} onClose={close} />
      )}
    </span>
  );
}

// value může obsahovat víc jmen oddělených čárkou nebo " a "
export default function AuthorNames({ value, role }) {
  const authors = useAuthors();
  const names = String(value || "")
    .split(/\s*,\s*|\s+a\s+/)
    .map((n) => n.trim())
    .filter(Boolean);

  return (
    <>
      {names.map((name, index) => (
        <React.Fragment key={`${name}-${index}`}>
          {index > 0 && ", "}
          <AuthorName name={name} role={role} authors={authors} />
        </React.Fragment>
      ))}
    </>
  );
}
