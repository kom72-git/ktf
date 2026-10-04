// Plovoucí tlačítko "Zpět nahoru", zobrazí se po odrolování stránky. Sdílí ho přehled i detail známky.
import React, { useEffect, useState } from "react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 320);
      // Dole tlačítko zastavíme v mezeře těsně nad patičkou, ať nezakrývá obsah ani odkazy.
      const footer = document.querySelector("footer");
      const overlap = footer ? window.innerHeight - footer.getBoundingClientRect().top : 0;
      setLift(overlap > 0 ? overlap : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top-button"
      style={lift > 0 ? { bottom: Math.max(22, lift - 22) } : undefined}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Zpět na začátek stránky"
      title="Zpět nahoru"
    >
      ↑
    </button>
  );
}
