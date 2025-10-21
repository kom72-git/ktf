import React from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import StampCatalog from "./StampCatalog";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogWrapper />} />
        <Route path="/detail/:id" element={<DetailWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

function CatalogWrapper() {
  const navigate = useNavigate();
  return <StampCatalog detailId={null} setDetailId={id => navigate(id ? `/detail/${id}` : "/")} />;
}

function DetailWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <StampCatalog detailId={id} setDetailId={id => navigate(id ? `/detail/${id}` : "/")} />;
}
