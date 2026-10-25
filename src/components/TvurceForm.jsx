// Formulář pro úpravu karty autora (jen správce); ukládá do kolekce "tvurci".
import React, { useState } from "react";
import { apiFetch, getApiBase } from "../apiBase.js";
import { autoFoto } from "../utils/tvurciFoto.js";
import { upsertCachedAuthor } from "./TvurceJmena.jsx";

export default function AuthorForm({ name, author, onSaved }) {
  const [form, setForm] = useState(() => ({
    foto: author?.foto || autoFoto(name),
    narozen: author?.narozen || "",
    zemrel: author?.zemrel || "",
    popis: author?.popis || "",
    zdrojUrl: author?.zdrojUrl || "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`${getApiBase()}/api/tvurci`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jmeno: name, ...form }),
      });
      if (response.status === 401) throw new Error("Platnost přihlášení vypršela, přihlaste se znovu.");
      if (!response.ok) throw new Error("Uložení se nezdařilo.");
      const saved = await response.json();
      upsertCachedAuthor(saved);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="author-edit-form" className="author-edit-form" onSubmit={save}>
      <label>
        Fotografie (cesta k souboru)
        <input type="text" value={form.foto} onChange={setField("foto")} />
      </label>
      <div className="author-edit-years">
        <label>
          Narozen
          <input type="text" value={form.narozen} onChange={setField("narozen")} />
        </label>
        <label>
          Zemřel
          <input type="text" value={form.zemrel} onChange={setField("zemrel")} />
        </label>
      </div>
      <label>
        Popis
        <textarea rows="12" value={form.popis} onChange={setField("popis")} />
      </label>
      <div className="ktf-tip-wrap" role="note" aria-label="Nápověda">
        <span className="ktf-tip-title"><span className="ktf-tip-icon" aria-hidden="true">i</span>Tip</span>
        <div className="ktf-tip-box">
          <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Odkaz v popisu: napiš <code>[text odkazu](https://adresa)</code>, např. <code>[Infofila](https://www.infofila.cz/vaclav-fajt-r-2-c-19)</code>. V hranatých závorkách je to, co čtenář uvidí, v kulatých adresa.</span>
          <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Formátování: <code>&lt;b&gt;&lt;/b&gt;</code> tučně ✧ <code>&lt;em&gt;&lt;/em&gt;</code> kurzíva ✧ <code>&lt;u&gt;&lt;/u&gt;</code> podtržení ✧ <code>&lt;br /&gt;</code> nový řádek ✧ <code>&lt;sup&gt;&lt;/sup&gt;</code> horní index ✧ <code>&lt;sub&gt;&lt;/sub&gt;</code> dolní index</span>
          <span className="ktf-edit-hint ktf-edit-tip ktf-tip-line">Pole Zdroj textu: vlož celou adresu a zobrazí se jen doména (např. „infofila.cz"). Chceš-li vlastní název, použij stejný zápis <code>[název](https://adresa)</code>.</span>
        </div>
      </div>
      <label>
        Zdroj textu – odkaz
        <input type="text" placeholder="https://…  nebo  [název](https://…)" value={form.zdrojUrl} onChange={setField("zdrojUrl")} />
      </label>
      {error && <div className="author-pop-error">{error}</div>}
      {saving && <div>Ukládám…</div>}
    </form>
  );
}
