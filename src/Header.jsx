import React from "react";

export default function Header({ navigate }) {
  return (
    <header className="header">
      <h1 className="main-title" style={{cursor: 'pointer'}} onClick={() => navigate && navigate('/') }>
        <img src="/img/inicialy-K.png" alt="K" className="main-title-img" />atalog <span className="main-title-nowrap"><img src="/img/inicialy-T.png" alt="T" className="main-title-img" />iskových</span> <span className="main-title-nowrap"><img src="/img/inicialy-F.png" alt="F" className="main-title-img" />orem</span> <span className="main-title-small">československých známek</span>
      </h1>
      <p className="subtitle">Seznam studií rozlišení tiskových forem, desek a polí při tisku československých známek v letech 1945-92.</p>
    </header>
  );
}
