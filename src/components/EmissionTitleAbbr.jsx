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
