import React from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import StampCatalog from "./StampCatalog";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogWrapper />} />
        <Route path="/emise/:slug-:year" element={<CatalogWrapper />} />
        <Route path="/emise/:slug" element={<CatalogWrapper />} />
        <Route path="/detail/:id" element={<DetailWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

function CatalogWrapper() {
  const navigate = useNavigate();
  const { slug, year } = useParams();
  // Klíč vynutí remount při změně adresy (slug a year)
  const key = `${slug || 'all'}-${year || 'all'}`;
  return (
    <StampCatalog
      key={key}
      detailId={null}
      setDetailId={id => navigate(id ? `/detail/${id}` : "/")}
      initialEmissionSlug={slug}
      initialYear={year}
    />
  );
}

function DetailWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <StampCatalog detailId={id} setDetailId={id => navigate(id ? `/detail/${id}` : "/")} />;
}
