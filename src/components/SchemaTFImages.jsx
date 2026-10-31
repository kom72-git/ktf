import React, { useState } from "react";
import { Fancybox } from "@fancyapps/ui";
import { getSchemaTFEntries } from "../utils/obrazekCesta.js";

export function SchemaTFEditor({ value, onChange, suggestionListId, onSave }) {
  const entries = getSchemaTFEntries(value);
  return (
    <div className="schema-tf-editor">
      {entries.map((entry, index) => (
        <div className="edit-field-row" key={index}>
          <input
            type="text"
            aria-label={`Obrázek schématu TF ${index + 1}`}
            value={entry}
            onChange={event => onChange(entries.map((current, position) => (
              position === index ? event.target.value : current
            )))}
            className="ktf-edit-input-tech"
            list={suggestionListId}
            autoComplete="off"
          />
          {entries.length > 1 && (
            <button
              type="button"
              className="ktf-btn-delete"
              aria-label={`Odebrat obrázek schématu TF ${index + 1}`}
              onClick={() => onChange(entries.filter((_, position) => position !== index))}
            >×</button>
          )}
        </div>
      ))}
      <div className="schema-tf-editor-actions">
        <button type="button" className="ktf-btn-confirm" onClick={() => onChange([...entries, ""])}>
          + Přidat obrázek schématu
        </button>
        {onSave && (
          <button type="button" className="ktf-btn-check" aria-label="Uložit schéma TF" onClick={onSave}>✓</button>
        )}
      </div>
    </div>
  );
}

export function SchemaTFGallery({ images, normalizeImageSrc }) {
  const [selectedImage, setSelectedImage] = useState("");
  const activeIndex = Math.max(0, images.indexOf(selectedImage));
  if (!images.length) return null;

  const handleImageError = event => {
    const target = event.currentTarget;
    if (target.getAttribute("src") === "/img/no-image.png") return;
    target.src = "/img/no-image.png";
    target.classList.add("tf-img-missing");
  };
  const openGallery = () => {
    Fancybox.show(
      images.map((src, index) => ({
        src: normalizeImageSrc(src),
        caption: images.length > 1 ? `Schéma TF – ${index + 1} / ${images.length}` : "Schéma TF",
      })),
      {
        startIndex: activeIndex,
        Toolbar: ["zoom", "close"],
        dragToClose: true,
        animated: true,
        compact: false,
        showClass: "fancybox-zoomIn",
        hideClass: "fancybox-zoomOut",
        closeButton: "top",
        defaultType: "image",
        Carousel: { Thumbs: { showOnStart: false } },
      }
    );
  };
  return (
    <div className="schema-tf-gallery">
      <button type="button" className="schema-tf-main" onClick={openGallery} aria-label={`Zvětšit schéma TF ${activeIndex + 1}`}>
        <img
          key={images[activeIndex]}
          src={normalizeImageSrc(images[activeIndex])}
          alt={images.length > 1 ? `Schéma TF ${activeIndex + 1}` : "Schéma TF"}
          className="tf-img tf-img-clickable"
          onError={handleImageError}
        />
      </button>
      {images.length > 1 && (
        <div className="schema-tf-thumbnails" role="group" aria-label="Obrázky schématu TF">
          {images.map((src, index) => (
            <button
              type="button"
              key={`${src}-${index}`}
              className="schema-tf-thumbnail"
              aria-label={`Zobrazit schéma TF ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setSelectedImage(src)}
            >
              <img src={normalizeImageSrc(src)} alt="" onError={handleImageError} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
