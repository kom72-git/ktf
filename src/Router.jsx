import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, useNavigationType } from "react-router-dom";
import StampCatalog from "./StampCatalog";
import Help from "./Help";
import Contact from "./Contact";
import MissingChecklist from "./MissingChecklist";
import Tvurce from "./Tvurce";
import Tvurci from "./Tvurci";
import VariantOverview from "./VariantOverview";
import { setPageMetadata } from "./utils/seo.js";

// Staré odkazy ve tvaru /#/detail/... převedeme na adresu bez #
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  window.history.replaceState(null, "", window.location.hash.slice(1));
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <StaticPageMetadata />
      <Routes>
        <Route path="/" element={<CatalogWrapper />} />
        <Route path="/rok/:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug-:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug" element={<CatalogWrapper />} />
        <Route path="/detail/:id" element={<DetailWrapper />} />
        <Route path="/tvurci" element={<Tvurci />} />
        <Route path="/tvurce/:slug" element={<Tvurce />} />
        <Route path="/chybenka" element={<MissingChecklist />} />
        <Route path="/prehled-variant" element={<VariantOverview />} />
        <Route path="/napoveda" element={<Help />} />
        <Route path="/kontakt" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}

function StaticPageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pages = {
      "/napoveda": {
        title: "Nápověda | Filatelium",
        description: "Nápověda k přehledu studií československých známek: vyhledávání, filtry, detail známky a její varianty.",
      },
      "/kontakt": {
        title: "Kontakt | Filatelium",
        description: "Kontaktní e-mail na Filatelium.",
      },
      "/tvurci": {
        title: "Tvůrci známek | Filatelium",
        description: "Přehled tvůrců československých poštovních známek z let 1945–1992 a jejich známek v katalogu Filatelium.",
      },
      "/chybenka": {
        title: "Chyběnka | Filatelium",
        description: "Přehled známek a variant, které ve své sbírce postrádáte. Procházejte přehled studií československých známek.",
        noIndex: true,
      },
      "/prehled-variant": {
        title: "Přehled variant | Filatelium",
        description: "Přehled variant a deskových vad československých poštovních známek z let 1945–1992.",
        noIndex: true,
      },
    };
    const page = pages[pathname];
    if (page) setPageMetadata({ ...page, path: pathname });
  }, [pathname]);

  return null;
}

function CatalogWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  // Rozlišíme, zda je to /rok/:year nebo /emise/:slug(-:year)?
  const { slug, year } = params;
  // V BrowserRouter nelze spoléhat na window.location.pathname; určeme podle přítomnosti parametrů
  const isYearRoute = (!slug && !!year);
  const key = `${slug || 'all'}-${year || 'all'}-${isYearRoute ? 'year' : 'emission'}`;
  return (
    <StampCatalog
      key={key}
      detailId={null}
      setDetailId={id => {
        if (!id) return navigate("/");
        window.sessionStorage.setItem(`ktf-scroll:${location.key}`, String(window.scrollY));
        navigate(`/detail/${id}`, { state: { returnToCatalog: true } });
      }}
      initialEmissionSlug={isYearRoute ? null : slug}
      initialYear={year}
      onlyYear={isYearRoute}
    />
  );
}

function DetailWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <StampCatalog
      detailId={id}
      setDetailId={nextId => {
        if (nextId) {
          navigate(`/detail/${nextId}`, { state: location.state });
        } else if (location.state?.returnToCatalog) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }}
    />
  );
}

// Nová navigace vždy začíná nahoře; při Zpět necháme obnovit pozici prohlížeči
function ScrollToTop() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const storageKey = `ktf-scroll:${location.key}`;
    let restoreFrame = 0;
    let isRestoring = false;
    const firstEffectForDocument = !window.__ktfScrollRestorationInitialized;
    window.__ktfScrollRestorationInitialized = true;
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    const isReload = firstEffectForDocument && navigationType === "reload";
    const savedValue = type === "POP" && !isReload ? window.sessionStorage.getItem(storageKey) : null;
    const savedPosition = savedValue === null ? NaN : Number(savedValue);

    const savePosition = () => {
      if (!isRestoring && window.location.pathname === location.pathname) {
        window.sessionStorage.setItem(storageKey, String(window.scrollY));
      }
    };

    if (isReload) {
      window.sessionStorage.setItem(storageKey, "0");
      window.scrollTo({ top: 0, left: 0 });
    } else if (type === "POP" && Number.isFinite(savedPosition)) {
      isRestoring = true;
      const startedAt = performance.now();
      const restorePosition = () => {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScroll >= savedPosition || performance.now() - startedAt >= 10000) {
          window.scrollTo({ top: Math.min(savedPosition, maxScroll), left: 0 });
          isRestoring = false;
          savePosition();
          restoreFrame = 0;
          return;
        }
        restoreFrame = requestAnimationFrame(restorePosition);
      };
      restoreFrame = requestAnimationFrame(restorePosition);
    } else if (type !== "POP") {
      window.scrollTo({ top: 0, left: 0 });
    }

    window.addEventListener("scroll", savePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", savePosition);
      if (restoreFrame) cancelAnimationFrame(restoreFrame);
    };
  }, [location.key, type]);
  return null;
}
