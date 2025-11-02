import React, { useState, useRef, useEffect } from 'react';
import './AbbrWithTooltip.css';

// Komponenta pro univerzální tooltip fungující na desktopu (hover) i mobilech (tap)
export default function AbbrWithTooltip({ abbr, title }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef();
  const abbrRef = useRef();
  const bubbleRef = useRef();

  // Zavřít tooltip při kliknutí mimo
  useEffect(() => {
    if (!visible) return;
    function handleClick(e) {
      if (abbrRef.current && !abbrRef.current.contains(e.target)) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [visible]);

  // Po zobrazení tooltipu na mobilu uprav pozici, aby byl celý viditelný
  useEffect(() => {
    if (!visible) return;
    if (!bubbleRef.current) return;
    if (!window.matchMedia('(hover: none)').matches) return; // jen na mobilu
    const bubble = bubbleRef.current;
    const rect = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = 0;
    // Pokud tooltip přesahuje vpravo, posuň ho doleva
    if (rect.right > vw - 8) {
      left = vw - rect.width - 16;
      if (left < 0) left = 8; // nikdy úplně vlevo
      bubble.style.left = left + 'px';
    } else {
      bubble.style.left = '';
    }
  }, [visible]);

  // Automatické zavření tooltipu po 3s na mobilech
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(hover: none)').matches) {
      timeoutRef.current = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeoutRef.current);
    }
  }, [visible]);

  // Zobrazit tooltip na hover (desktop) nebo tap (mobil)
  const showTooltip = (e) => {
    if (window.matchMedia('(hover: none)').matches) {
      // Na mobilu zabráníme propadnutí události k rodičovskému odkazu
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      setVisible(v => !v); // tap: toggle
    } else {
      setVisible(true); // hover: show
    }
  };
  const hideTooltip = () => {
    if (!window.matchMedia('(hover: none)').matches) {
      setVisible(false);
    }
  };

  return (
    <span
      className="ktf-abbr-tooltip-wrapper"
      ref={abbrRef}
      tabIndex={0}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onClick={showTooltip}
      style={{display: 'inline-block', position: 'relative'}}
    >
      <abbr className="ktf-abbr-tooltip-abbr" aria-label={title}>{abbr}</abbr>
      {visible && (
        <span className="ktf-abbr-tooltip-bubble" ref={bubbleRef}>{title}</span>
      )}
    </span>
  );
}
