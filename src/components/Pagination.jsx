// Komponenta Pagination zobrazuje stránkování (pagination) pro hlavní stránku katalogu.
// Obsahuje tlačítka pro přechod mezi stránkami a zobrazuje aktuální stránku.
// Používá se na hlavní stránce katalogu.
import React from "react";
import "../App.css";

export default function Pagination({
  homePage,
  totalHomepagePages,
  homepageVisiblePages,
  onPageChange
}) {
  if (totalHomepagePages <= 1) return null;

  return (
    <div className="home-pagination-row" role="navigation" aria-label="Stránkování emisí">
      <div className="home-pagination">
        <button
          type="button"
          className="home-pagination-btn"
          onClick={() => onPageChange(homePage - 1)}
          disabled={homePage <= 1}
          aria-label="Předchozí stránka"
        >
          Předchozí
        </button>

        {homepageVisiblePages.map((pageToken) => {
          if (typeof pageToken !== "number") {
            return (
              <span key={String(pageToken)} className="home-pagination-ellipsis" aria-hidden="true">…</span>
            );
          }

          const isActive = pageToken === homePage;
          return (
            <button
              key={pageToken}
              type="button"
              className={`home-pagination-btn home-pagination-btn--page${isActive ? " home-pagination-btn--active" : ""}`}
              onClick={() => onPageChange(pageToken)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Strana ${pageToken}`}
            >
              {pageToken}
            </button>
          );
        })}

        <button
          type="button"
          className="home-pagination-btn"
          onClick={() => onPageChange(homePage + 1)}
          disabled={homePage >= totalHomepagePages}
          aria-label="Další stránka"
        >
          Další
        </button>
      </div>
    </div>
  );
}
