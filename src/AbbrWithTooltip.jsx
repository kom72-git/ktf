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

  // Po zobrazení tooltipu uprav pozici, aby byl vždy celý viditelný (mobil i úzké okno)
  useEffect(() => {
    if (!visible) return;
    if (!bubbleRef.current || !abbrRef.current) return;
    // Mobil = hover: none nebo úzké okno
    const isMobile = window.matchMedia('(hover: none)').matches || window.innerWidth < 600;
    if (!isMobile) {
      bubbleRef.current.style.left = '';
      bubbleRef.current.style.transform = '';
      return;
    }
    const bubble = bubbleRef.current;
    const abbr = abbrRef.current;
    // Zarovnat tooltip na střed zkratky
    const abbrRect = abbr.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    // Výchozí pozice: tooltip na střed zkratky
    let left = abbrRect.left + abbrRect.width/2 - bubbleRect.width/2;
    // Pokud by tooltip přesahoval vlevo, zarovnat na 8px od okraje
    if (left < 8) left = 8;
    // Pokud by tooltip přesahoval vpravo, zarovnat na 8px od pravého okraje
    if (left + bubbleRect.width > vw - 8) left = vw - bubbleRect.width - 8;
    bubble.style.left = left + 'px';
    bubble.style.transform = 'none';
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
