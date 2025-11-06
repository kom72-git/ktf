import React, { useState, useRef, useEffect } from "react";

// Tooltip zkratky, který funguje na desktopu (hover) i mobilech (tap)
export default function AbbrWithTooltip({ abbr, title }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef();
  const abbrRef = useRef();
  const bubbleRef = useRef();

  // Zavře tooltip při kliknutí mimo
  useEffect(() => {
    if (!visible) return;
    function handleClick(e) {
      if (abbrRef.current && !abbrRef.current.contains(e.target)) {
        setVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [visible]);

  // Po zobrazení upraví pozici, aby bublina zůstala v zorném poli i na mobilech
  useEffect(() => {
    if (!visible) return;
    if (!bubbleRef.current || !abbrRef.current) return;
    const isMobile =
      window.matchMedia("(hover: none)").matches || window.innerWidth < 600;
    if (!isMobile) {
      bubbleRef.current.style.left = "";
      bubbleRef.current.style.transform = "";
      return;
    }
    const bubble = bubbleRef.current;
    const abbr = abbrRef.current;
    const abbrRect = abbr.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = abbrRect.left + abbrRect.width / 2 - bubbleRect.width / 2;
    if (left + bubbleRect.width > vw - 8) {
      left = vw - bubbleRect.width - 8;
    }
    if (left < 8) {
      left = 8;
    }
    bubble.style.left = left - abbrRect.left + "px";
    bubble.style.transform = "none";
  }, [visible]);

  // Na mobilech tooltip po chvíli schová
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(hover: none)").matches) {
      timeoutRef.current = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeoutRef.current);
    }
  }, [visible]);

  const showTooltip = (e) => {
    if (window.matchMedia("(hover: none)").matches) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      setVisible((v) => !v);
    } else {
      setVisible(true);
    }
  };

  const hideTooltip = () => {
    if (!window.matchMedia("(hover: none)").matches) {
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
      style={{ display: "inline-block", position: "relative" }}
    >
      <abbr className="ktf-abbr-tooltip-abbr" aria-label={title}>
        {abbr}
      </abbr>
      {visible && (
        <span className="ktf-abbr-tooltip-bubble" ref={bubbleRef}>
          {title}
        </span>
      )}
    </span>
  );
}
