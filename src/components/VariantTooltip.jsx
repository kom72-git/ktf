import React, { useState, useRef, useEffect } from "react";

export default function VariantTooltip({ children, tooltip }) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef();
  const tooltipRef = useRef();

  // Přepočítá pozici tooltipu podle boxu varianty
  useEffect(() => {
    if (!show) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;
    let parent = tooltipEl.parentElement;
    while (parent && !parent.classList.contains("variant")) {
      parent = parent.parentElement;
    }
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    tooltipEl.style.position = "fixed";
    tooltipEl.style.left = `${parentRect.left}px`;
    tooltipEl.style.top = `${parentRect.bottom}px`;
    tooltipEl.style.width = `${parentRect.width}px`;
    tooltipEl.style.right = "auto";
    tooltipEl.style.transform = "none";
    tooltipEl.style.zIndex = 3000;
  }, [show]);

  // Mobil: tap toggluje, tap mimo zavře
  useEffect(() => {
    const isMobile = window.matchMedia("(hover: none)").matches;
    if (!isMobile || !show) return;
    function handleTouch(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) {
        setShow((v) => !v);
      } else if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShow(false);
      }
    }
    document.addEventListener("touchstart", handleTouch);
    return () => document.removeEventListener("touchstart", handleTouch);
  }, [show]);

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  const triggerProps = isMobile
    ? {
        onClick: () => setShow((v) => !v),
        title: "Zobrazit celý popis",
      }
    : {
        onMouseEnter: () => setShow(true),
        onMouseLeave: () => setShow(false),
        title: "Zobrazit celý popis",
      };

  return (
    <span
      className="variant-tooltip-wrapper"
      style={{ position: "relative", display: "inline", width: "auto" }}
    >
      <span ref={triggerRef} className="variant-tooltip-trigger" {...triggerProps}>
        {children}
      </span>
      {show && (
        <div ref={tooltipRef} className="variant-tooltip-bubble">
          {tooltip}
        </div>
      )}
    </span>
  );
}
