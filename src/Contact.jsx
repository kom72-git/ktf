import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="page-bg">
      <Header navigate={navigate} />
      <main className="main">
        <section className="stamp-detail-block help-page" aria-labelledby="contact-page-title">
          <div className="detail-title help-main-title-wrap">
            <h1 id="contact-page-title" className="detail-title-text">Kontakt</h1>
          </div>
          <p className="help-lead">Kontaktovat nás můžete na e-mailové adrese:</p>
          <p className="help-lead"><strong>info@filatelium.cz</strong></p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
