import React from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import StampCatalog from "./StampCatalog";
import Help from "./Help";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogWrapper />} />
        <Route path="/rok/:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug-:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug" element={<CatalogWrapper />} />
        <Route path="/detail/:id" element={<DetailWrapper />} />
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
  const isYearRoute = window.location.pathname.startsWith('/rok/');
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
