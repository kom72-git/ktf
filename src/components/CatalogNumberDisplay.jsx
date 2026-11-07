import React from "react";
import { renderCatalogDisplay, splitCatalogDisplaySuffix } from "../utils/katalog.js";

export default function CatalogNumberDisplay({ text }) {
  return String(text || "").split(/,\s*/).map((part, index) => {
    const { base, suffix } = splitCatalogDisplaySuffix(part);
    const catalogMatch = base.trim().match(/^([A-ZČŘŽŠĚÚŮ]+)?\s*([\d/]+)$/i);
    const separator = index > 0 ? ", " : null;
    if (!catalogMatch) {
      return <React.Fragment key={`${index}-${part}`}>{separator}{renderCatalogDisplay(part)}</React.Fragment>;
    }

    const [, prefix = "", number] = catalogMatch;
    const normalizedPrefix = prefix.toUpperCase();
    const prefixTitle = prefix
      ? normalizedPrefix === "A"
        ? "Aršík"
        : normalizedPrefix === "PL"
          ? "Přepážkový list"
          : `Katalogový prefix ${prefix}`
      : "";

    return (
      <React.Fragment key={`${index}-${part}`}>
        {separator}
        <span className="stamp-catalog-item">
          {prefix && <span className="stamp-catalog-prefix" title={prefixTitle || undefined}>{prefix}</span>}
          {prefix && " "}
          <strong className="stamp-catalog-number">{number}</strong>
          {suffix && <span className="stamp-catalog-pair-suffix">{/^(?:A|B)(?:\/(?:A|B))*$/i.test(suffix) ? `(${suffix})` : suffix}</span>}
        </span>
      </React.Fragment>
    );
  });
}