// Plovoucí tlačítko "Zpět nahoru", zobrazí se po odrolování stránky. Sdílí ho přehled i detail známky.
import React, { useEffect, useState } from "react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 320);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top-button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Zpět na začátek stránky"
      title="Zpět nahoru"
    >
      ↑
    </button>
  );
}
