// Komponenta StampBoxList vykresluje seznam boxů emisí na hlavní stránce katalogu.
// Každý box reprezentuje jednu emisi (nebo skupinu emisí) a obsahuje obrázek, název a katalogové číslo.
// Boxy mohou být sbalené (sloučené) nebo rozbalené (jednotlivé varianty).
// Používá se v hlavní komponentě StampCatalog.

import React from "react";
import EmissionTitleAbbr from "./EmissionTitleAbbr.jsx";
import { normalizeStampImagePath } from "../utils/obrazekCesta.js";
import { katalogSort, emissionToSlug, getCatalogBaseKey, formatGroupedCatalogText, renderCatalogDisplay } from "../utils/katalog.js";
import { renderEmissionTitleWithPragaSuffix } from "../utils/formatovaniTextu.jsx";

export default function StampBoxList({
  boxesToRender,
  expandedBoxes,
  handleToggleBox,
  onNavigateToDetail,
  onNavigateToEmission,
}) {
  // Předpočítat střídající se pruhy pro sousedící rozbalené boxy
  const stripeMap = new Map();
  let stripeCounter = 0;
  boxesToRender.forEach(([key, items]) => {
    const anyExpanded = expandedBoxes.includes(key);
    const sameBase = items.length > 1 &&
      items.every(s => getCatalogBaseKey(s) === getCatalogBaseKey(items[0]));
    if (anyExpanded && !sameBase) {
      stripeMap.set(key, stripeCounter % 2);
      stripeCounter++;
    }
  });

  return (
    <div className="stamp-list-layout">
      {boxesToRender.flatMap(([key, items]) => {
        const sortedItems = [...items].sort(katalogSort);
        const item = sortedItems[0];
        const allSameBaseKey = sortedItems.length > 1 &&
          sortedItems.every(s => getCatalogBaseKey(s) === getCatalogBaseKey(sortedItems[0]));
        const isSingle = sortedItems.length === 1 || allSameBaseKey;
        const [emise, rok] = key.split('|');
        // Pro slug použijeme emiseSkupina (pokud existuje), jinak emise – stejná logika jako getEmissionFilterName v katalogu.
        // Zajišťuje, že proklik na emisi správně najde skupinu emise přes slugToEmission.
        const emissionName = (typeof item.emiseSkupina === 'string' && item.emiseSkupina.trim()) ? item.emiseSkupina.trim() : emise;
        const slug = emissionToSlug(emissionName);
        const expanded = expandedBoxes.includes(key);

        if (!expanded || allSameBaseKey) {
          // SLOUČENÝ BOX
          const groupedForCollapsed = new Map();
          sortedItems.forEach((entry) => {
            const groupKey = getCatalogBaseKey(entry);
            if (!groupedForCollapsed.has(groupKey)) {
              groupedForCollapsed.set(groupKey, [entry]);
            } else {
              groupedForCollapsed.get(groupKey).push(entry);
            }
          });

          const groupedTexts = Array.from(groupedForCollapsed.values())
            .map((group) => formatGroupedCatalogText([...group].sort(katalogSort)))
            .filter(Boolean);

          let katalogText = groupedTexts.join(', ');
          if (groupedTexts.length > 1) {
            const firstParts = groupedTexts[0].match(/^([A-ZČŘŽŠĚÚŮ]+)\s+(.+)$/i);
            if (firstParts) {
              const sharedPrefix = firstParts[1];
              const hasAllSamePrefix = groupedTexts.every((text) => text.startsWith(`${sharedPrefix} `));
              if (hasAllSamePrefix) {
                katalogText = groupedTexts
                  .map((text, index) => (index === 0 ? text : text.replace(new RegExp(`^${sharedPrefix}\\s+`), '')))
                  .join(', ');
              }
            }
          }

          return (
            <div key={key} className="stamp-card stamp-card-pointer"
              style={{ position: 'relative' }}
              onClick={() => {
                if (isSingle) {
                  onNavigateToDetail(item.idZnamky);
                } else {
                  onNavigateToEmission(slug, rok, key);
                }
              }}>
              {!isSingle && (
                <button className="stamp-box-toggle" title="Rozbalit box" style={{ right: 2, top: 2, position: 'absolute' }}
                  onClick={e => { e.stopPropagation(); handleToggleBox(key); }}
                >+</button>
              )}
              <div className="stamp-img-bg">
                {item.obrazek ? (
                  <img
                    src={normalizeStampImagePath(item.obrazek, item.rok)}
                    alt={item.emise}
                    onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                  />
                ) : (
                  <div className="stamp-img-missing">obrázek chybí</div>
                )}
              </div>
              <div className="stamp-title stamp-title-abbr">
                <EmissionTitleAbbr>{renderEmissionTitleWithPragaSuffix(emise, rok)}</EmissionTitleAbbr>
              </div>
              <div className="stamp-bottom">
                <div>Katalog: <span className="catalog">{renderCatalogDisplay(katalogText)}</span></div>
                {isSingle && (
                  <span className="details-link" style={{ marginLeft: 8, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>detaily</span>
                )}
              </div>
            </div>
          );
        } else {
          // ROZBALENÉ BOXy
          const groupedForExpanded = new Map();
          sortedItems.forEach((entry) => {
            const groupKey = getCatalogBaseKey(entry);
            if (!groupedForExpanded.has(groupKey)) {
              groupedForExpanded.set(groupKey, [entry]);
            } else {
              groupedForExpanded.get(groupKey).push(entry);
            }
          });
          const expandedCards = Array.from(groupedForExpanded.values()).map((group) => {
            const groupSorted = [...group].sort(katalogSort);
            return {
              item: groupSorted[0],
              katalogText: formatGroupedCatalogText(groupSorted),
            };
          });

          const stripeClass = stripeMap.get(key) === 1 ? 'stamp-card-grouped-alt' : 'stamp-card-grouped';
          return expandedCards.map(({ item, katalogText }, idx) => (
            <div key={key + '-' + idx} className={`stamp-card ${stripeClass} stamp-card-pointer`}
              style={{ position: 'relative' }}
              onClick={() => onNavigateToDetail(item.idZnamky)}>
              {idx === 0 && (
                <button className="stamp-box-toggle" title="Sloučit boxy" style={{ right: 2, top: 2, position: 'absolute' }}
                  onClick={e => { e.stopPropagation(); handleToggleBox(key); }}
                >−</button>
              )}
              <div className="stamp-img-bg">
                {item.obrazek ? (
                  <img
                    src={normalizeStampImagePath(item.obrazek, item.rok)}
                    alt={item.emise}
                    onError={e => { e.target.onerror = null; e.target.src = '/img/no-image.png'; }}
                  />
                ) : (
                  <div className="stamp-img-missing">obrázek chybí</div>
                )}
              </div>
              <div className="stamp-title stamp-title-abbr">
                <EmissionTitleAbbr>{renderEmissionTitleWithPragaSuffix(item.emise, item.rok)}</EmissionTitleAbbr>
              </div>
              <div className="stamp-bottom">
                <div>Katalog: <span className="catalog">{renderCatalogDisplay(katalogText || item.katalogCislo)}</span></div>
                <span className="details-link" style={{ marginLeft: 8, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>detaily</span>
              </div>
            </div>
          ));
        }
      })}
    </div>
  );
}
