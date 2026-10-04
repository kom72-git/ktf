import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, useNavigationType } from "react-router-dom";
import StampCatalog from "./StampCatalog";
import Help from "./Help";
import MissingChecklist from "./MissingChecklist";
import VariantOverview from "./VariantOverview";

// Staré odkazy ve tvaru /#/detail/... převedeme na adresu bez #
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  window.history.replaceState(null, "", window.location.hash.slice(1));
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<CatalogWrapper />} />
        <Route path="/rok/:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug-:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug" element={<CatalogWrapper />} />
        <Route path="/detail/:id" element={<DetailWrapper />} />
        <Route path="/chybenka" element={<MissingChecklist />} />
        <Route path="/prehled-variant" element={<VariantOverview />} />
        <Route path="/napoveda" element={<Help />} />
      </Routes>
    </BrowserRouter>
  );
}

function CatalogWrapper() {
  const navigate = useNavigate();
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
      setDetailId={id => navigate(id ? `/detail/${id}` : "/")}
      initialEmissionSlug={isYearRoute ? null : slug}
      initialYear={year}
      onlyYear={isYearRoute}
    />
  );
}

function DetailWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <StampCatalog detailId={id} setDetailId={id => navigate(id ? `/detail/${id}` : "/")} />;
}

// Nová navigace vždy začíná nahoře; při Zpět necháme obnovit pozici prohlížeči
function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== "POP") window.scrollTo({ top: 0, left: 0 });
  }, [pathname, type]);
  return null;
}
