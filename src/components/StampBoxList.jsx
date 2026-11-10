// Komponenta StampBoxList vykresluje seznam boxů emisí na hlavní stránce katalogu.
// Každý box reprezentuje jednu emisi (nebo skupinu emisí) a obsahuje obrázek, název a katalogové číslo.
// Boxy mohou být sbalené (sloučené) nebo rozbalené (jednotlivé varianty).
// Používá se v hlavní komponentě StampCatalog.

import React, { useLayoutEffect, useRef, useState } from "react";
import EmissionTitleAbbr from "./EmissionTitleAbbr.jsx";
import CatalogNumberDisplay from "./CatalogNumberDisplay.jsx";
import { normalizeStampImagePath } from "../utils/obrazekCesta.js";
import { katalogSort, emissionToSlug, getCatalogBaseKey, isCatalogABPair, formatGroupedCatalogText } from "../utils/katalog.js";
import { renderEmissionTitleWithPragaSuffix } from "../utils/formatovaniTextu.jsx";
import { getStavFromStamp } from "../utils/stavUtils.js";

export default function StampBoxList({
  boxesToRender,
  expandedBoxes,
  handleToggleBox,
  onNavigateToDetail,
  onNavigateToEmission,
}) {
  const catalogListRef = useRef(null);
  const [expandHintKey, setExpandHintKey] = useState(null);

  useLayoutEffect(() => {
    const container = catalogListRef.current;
    if (!container) return undefined;

    let frame = 0;
    const equalizeCatalogRows = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const catalogBlocks = Array.from(container.querySelectorAll(".stamp-bottom > div"));
        catalogBlocks.forEach(block => {
          block.style.minHeight = "";
          const label = block.querySelector(".stamp-catalog-label");
          const catalog = block.querySelector(".catalog");
          if (!label || !catalog) return;

          block.classList.remove("stamp-catalog-label-above");
          catalog.classList.remove("stamp-catalog-single-line");
          const lineTops = new Set(Array.from(catalog.getClientRects(), rect => Math.round(rect.top)));
          if (lineTops.size < 2) return;

          block.classList.add("stamp-catalog-label-above");
          catalog.style.whiteSpace = "nowrap";
          const fitsWithoutLabel = catalog.scrollWidth <= catalog.clientWidth;
          catalog.style.whiteSpace = "";
          if (!fitsWithoutLabel) {
            block.classList.remove("stamp-catalog-label-above");
          } else {
            catalog.classList.add("stamp-catalog-single-line");
          }
        });

        const rows = new Map();
        catalogBlocks.forEach(block => {
          const card = block.closest(".stamp-card");
          if (!card) return;
          const rowTop = Math.round(card.getBoundingClientRect().top);
          const row = rows.get(rowTop) || [];
          row.push(block);
          rows.set(rowTop, row);
        });

        rows.forEach(rowBlocks => {
          if (rowBlocks.some(block => block.classList.contains("stamp-catalog-label-above"))) {
            rowBlocks.forEach(block => block.classList.add("stamp-catalog-label-above"));
          }
          if (rowBlocks.length < 2) return;
          const maxHeight = Math.max(...rowBlocks.map(block => block.getBoundingClientRect().height));
          rowBlocks.forEach(block => {
            block.style.minHeight = `${maxHeight}px`;
          });
        });
      });
    };

    equalizeCatalogRows();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(equalizeCatalogRows);
    observer?.observe(container);
    window.addEventListener("resize", equalizeCatalogRows);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", equalizeCatalogRows);
    };
  }, [boxesToRender, expandedBoxes]);

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
    <div className="stamp-list-layout" ref={catalogListRef}>
      {boxesToRender.flatMap(([key, items]) => {
        const sortedItems = [...items].sort(katalogSort);
        const item = sortedItems[0];
        const interniCount = sortedItems.reduce((sum, stamp) => sum + (getStavFromStamp(stamp) === 'interni' ? 1 : 0), 0);
        const pripravaCount = sortedItems.reduce((sum, stamp) => sum + (getStavFromStamp(stamp) === 'priprava' ? 1 : 0), 0);
        const hasAnyInterni = interniCount > 0;
        const hasAnyPriprava = pripravaCount > 0;
        const showUnpublishedHint = hasAnyInterni || hasAnyPriprava;
        const useInterniRibbon = hasAnyInterni;
        const ribbonClass = useInterniRibbon
          ? "stamp-unpublished-ribbon stamp-unpublished-ribbon-internal"
          : "stamp-unpublished-ribbon";
        const ribbonTitle = useInterniRibbon
          ? "Interní známky v této emisi"
          : "Nepublikované známky v této emisi";
        const allSameBaseKey = sortedItems.length > 1 &&
          sortedItems.every(s => getCatalogBaseKey(s) === getCatalogBaseKey(sortedItems[0]));
        const hasCatalogABPair = isCatalogABPair(sortedItems);
        const isSingle = sortedItems.length === 1 || (allSameBaseKey && !hasCatalogABPair);
        const ribbonClassWithGeometry = `${ribbonClass}${isSingle ? " stamp-unpublished-ribbon-fixed" : ""}`;
        const ribbonText = useInterniRibbon
          ? (isSingle ? "INTERNÍ" : `INTERNÍ ${interniCount}/${sortedItems.length}`)
          : (isSingle ? "V PŘÍPRAVĚ" : `V PŘÍPRAVĚ ${pripravaCount}/${sortedItems.length}`);
        const [emise, rok] = key.split('|');
        // Pro slug použijeme emiseSkupina (pokud existuje), jinak emise – stejná logika jako getEmissionFilterName v katalogu.
        // Zajišťuje, že proklik na emisi správně najde skupinu emise přes slugToEmission.
        const emissionName = (typeof item.emiseSkupina === 'string' && item.emiseSkupina.trim()) ? item.emiseSkupina.trim() : emise;
        const slug = emissionToSlug(emissionName);
        const expanded = expandedBoxes.includes(key);

        if (!expanded || (allSameBaseKey && !hasCatalogABPair)) {
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
            <div key={key} className={`stamp-card stamp-card-pointer${showUnpublishedHint ? " stamp-card-unpublished" : ""}${useInterniRibbon ? " stamp-card-internal" : ""}`}
              onPointerLeave={event => {
                if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                setExpandHintKey(current => current === key ? null : current);
              }}
              onClick={() => {
                if (isSingle) {
                  onNavigateToDetail(item.idZnamky);
                } else {
                  onNavigateToEmission(slug, rok, key);
                }
              }}>
              {showUnpublishedHint && (
                <span className={ribbonClassWithGeometry} title={ribbonTitle}>
                  {ribbonText}
                </span>
              )}
              {!isSingle && (
                <button className="stamp-box-toggle stamp-box-toggle-tight" aria-label="Rozbalit box"
                  onPointerEnter={event => {
                    if (event.pointerType !== "touch") setExpandHintKey(key);
                  }}
                  onPointerLeave={event => {
                    if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                    setExpandHintKey(current => current === key ? null : current);
                  }}
                  onFocus={() => setExpandHintKey(key)}
                  onBlur={event => {
                    if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                    setExpandHintKey(current => current === key ? null : current);
                  }}
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
                <div className="stamp-catalog-row"><span className="stamp-catalog-label">{sortedItems.length > 1 ? `Katalogová čísla (${sortedItems.length}):` : "Katalogové číslo:"}</span> <span className="catalog"><CatalogNumberDisplay text={katalogText} /></span></div>
                {isSingle ? (
                  <span className="stamp-detail-tab-mask">
                    <button type="button" className="stamp-detail-tab" onClick={e => { e.stopPropagation(); onNavigateToDetail(item.idZnamky); }}>Otevřít detail</button>
                  </span>
                ) : (
                  <span className="stamp-detail-tab-mask">
                    <button type="button" className="stamp-detail-tab" onClick={e => {
                      e.stopPropagation();
                      if (expandHintKey === key) {
                        handleToggleBox(key);
                        setExpandHintKey(null);
                      } else {
                        onNavigateToEmission(slug, rok, key);
                      }
                    }}>{expandHintKey === key ? "Rozbalit box" : "Otevřít emisi"}</button>
                  </span>
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
          const expandedCards = Array.from(groupedForExpanded.values()).flatMap((group) => {
            const groupSorted = [...group].sort(katalogSort);
            if (isCatalogABPair(groupSorted)) {
              return groupSorted.map((entry) => ({
                item: entry,
                katalogText: formatGroupedCatalogText([entry]),
              }));
            }
            return {
              item: groupSorted[0],
              katalogText: formatGroupedCatalogText(groupSorted),
            };
          });

          const stripeClass = stripeMap.get(key) === 1 ? 'stamp-card-grouped-alt' : 'stamp-card-grouped';
          return expandedCards.map(({ item, katalogText }, idx) => {
            const itemStav = getStavFromStamp(item);
            return (
              <div
                key={key + '-' + idx}
                className={`stamp-card ${stripeClass} stamp-card-pointer${(itemStav === 'priprava' || itemStav === 'interni') ? " stamp-card-unpublished" : ""}${itemStav === 'interni' ? " stamp-card-internal" : ""}`}
                onPointerLeave={event => {
                  if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                  setExpandHintKey(current => current === key ? null : current);
                }}
                onClick={() => onNavigateToDetail(item.idZnamky)}>
                {itemStav === 'priprava' && (
                  <span className="stamp-unpublished-ribbon stamp-unpublished-ribbon-fixed" title="Známka je nepublikovaná">V PŘÍPRAVĚ</span>
                )}
                {itemStav === 'interni' && (
                  <span className="stamp-unpublished-ribbon stamp-unpublished-ribbon-internal stamp-unpublished-ribbon-fixed" title="Známka je interní">INTERNÍ</span>
                )}
                {idx === 0 && (
                  <button
                    className="stamp-box-toggle stamp-box-toggle-tight"
                    aria-label="Sloučit box"
                    onPointerEnter={event => {
                      if (event.pointerType !== "touch") setExpandHintKey(key);
                    }}
                    onPointerLeave={event => {
                      if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                      setExpandHintKey(current => current === key ? null : current);
                    }}
                    onFocus={() => setExpandHintKey(key)}
                    onBlur={event => {
                      if (event.relatedTarget?.closest?.(".stamp-detail-tab-mask")) return;
                      setExpandHintKey(current => current === key ? null : current);
                    }}
                    onClick={e => { e.stopPropagation(); handleToggleBox(key); setExpandHintKey(null); }}
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
                  <div className="stamp-catalog-row"><span className="stamp-catalog-label">Katalogové číslo:</span> <span className="catalog"><CatalogNumberDisplay text={katalogText || item.katalogCislo} /></span></div>
                  <span className="stamp-detail-tab-mask">
                    <button type="button" className="stamp-detail-tab" onClick={e => {
                      e.stopPropagation();
                      if (idx === 0 && expandHintKey === key) {
                        handleToggleBox(key);
                        setExpandHintKey(null);
                      } else {
                        onNavigateToDetail(item.idZnamky);
                      }
                    }}>{idx === 0 && expandHintKey === key ? "Sloučit box" : "Otevřít detail"}</button>
                  </span>
                </div>
              </div>
            );
          });
        }
      })}
    </div>
  );
}
