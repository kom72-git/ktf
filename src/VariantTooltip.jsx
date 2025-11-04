import React, { useState, useRef, useEffect } from 'react';
import './VariantTooltip.css';

export default function VariantTooltip({ children, tooltip }) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef();
  const tooltipRef = useRef();

  // Desktop: tooltip pod tečkami, centrovaný
  // (mobilní logiku lze přidat později)

  // Tooltip bude vždy zarovnán vlevo k boxu popisku varianty

  useEffect(() => {
    if (!show) return;
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    // Najdi parent .variant
    let parent = tooltip.parentElement;
    while (parent && !parent.classList.contains('variant')) {
      parent = parent.parentElement;
    }
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    // Zarovnej tooltip k levému spodnímu rohu parentu
    tooltip.style.position = 'fixed';
    tooltip.style.left = parentRect.left + 'px';
    tooltip.style.top = parentRect.bottom + 'px';
    tooltip.style.width = parentRect.width + 'px';
    tooltip.style.right = 'auto';
    tooltip.style.transform = 'none';
    tooltip.style.zIndex = 3000;
  }, [show]);

  // Mobilní logika: tap = toggle, tap mimo = zavřít
  useEffect(() => {
    const isMobile = window.matchMedia('(hover: none)').matches;
    if (!isMobile || !show) return;
    function handleTouch(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) {
        // Tap na tečky: toggle
        setShow(v => !v);
      } else if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        // Tap mimo tooltip: zavřít
        setShow(false);
      }
    }
    document.addEventListener('touchstart', handleTouch);
    return () => document.removeEventListener('touchstart', handleTouch);
  }, [show]);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
  const triggerProps = isMobile
    ? {
        onClick: () => setShow(v => !v),
        title: 'Zobrazit celý popis',
      }
    : {
        onMouseEnter: () => setShow(true),
        onMouseLeave: () => setShow(false),
        title: 'Zobrazit celý popis',
      };

  return (
    <span className="variant-tooltip-wrapper" style={{ position: 'relative', display: 'inline', width: 'auto' }}>
      <span
        ref={triggerRef}
        className="variant-tooltip-trigger"
        {...triggerProps}
      >{children}</span>
      {show && (
        <div
          ref={tooltipRef}
          className="variant-tooltip-bubble"
        >{tooltip}</div>
      )}
    </span>
  );
}
