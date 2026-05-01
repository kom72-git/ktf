// Komponenta EmissionTitleAbbr slouží jako wrapper pro název emise.
// Zajišťuje, že kliknutí na tooltipy v názvu emise nepropaguje událost dál (např. do boxu).
// Používá se v katalogu a detailech známek.
import React from "react";

// Wrapper for emission titles that prevents tooltip clicks bubbling to parent toggles
export default function EmissionTitleAbbr({ children }) {
  const handleClick = (e) => {
    if (
      e.target.closest('.ktf-abbr-tooltip-abbr') ||
      e.target.closest('.ktf-abbr-tooltip-wrapper')
    ) {
      e.stopPropagation();
    }
  };

  return (
    <span onClick={handleClick}>{children}</span>
  );
}
