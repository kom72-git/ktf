import React, { useEffect } from "react";
import "./App.css";


export default function StampDetail({ stamp, onBack }) {
  // Lightbox stav odstraněn
  useEffect(() => {
    const handlePopState = () => {
      onBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);
  if (!stamp) return null;
  return (
    <div className="stamp-detail-block">
      <button
        className="back-btn"
        onClick={() => {
          window.history.back();
          onBack();
        }}
      >Zpět</button>
      <div className="stamp-detail-img-bg">
        <img src={stamp.image} alt={stamp.emission} className="stamp-detail-img" />
      </div>
      <h2 className="detail-title">{stamp.emission} ({stamp.year})</h2>
      <div className="detail-catalog">Katalogové číslo: <b>{stamp.catalogNumber}</b></div>
      <div className="detail-section">
        <h3>Technické údaje</h3>
        <ul>
          <li>Emise: {stamp.emission}</li>
          <li>Katalogové číslo: {stamp.catalogNumber}</li>
          <li>Nominál: {stamp.face}</li>
          <li>Tisková forma: {stamp.printingForm}</li>
        </ul>
      </div>
      <div className="detail-section">
        <h3>Deskové vady a varianty</h3>
        <h4 className="variant-group-title">Varianta A</h4>
        <div className="variants">
          {stamp.variants && stamp.variants.map((v, i) => (
            <div className="variant" key={i}>
              <img
                src={v.image}
                alt={v.caption}
                style={{ cursor: "pointer" }}
                // původní lightbox click odstraněn
              />
              <div className="variant-caption">obr. {i+1}: {v.caption}</div>
            </div>
          ))}
        </div>
        {/* Lightbox komponenta odstraněna */}
      </div>
    </div>
  );
}
