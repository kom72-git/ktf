import React from "react";
import { HashRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import StampCatalog from "./StampCatalog";
import Help from "./Help";
import MissingChecklist from "./MissingChecklist";
import VariantOverview from "./VariantOverview";

export default function Router() {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}

function CatalogWrapper() {
  const navigate = useNavigate();
  const params = useParams();
  // Rozlišíme, zda je to /rok/:year nebo /emise/:slug(-:year)?
  const { slug, year } = params;
  // V HashRouter nelze spoléhat na window.location.pathname; určeme podle přítomnosti parametrů
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
