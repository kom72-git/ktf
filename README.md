# Katalog TF



## Úkoly na později

### Filtry Rok / Emise / Katalogové číslo

Dnes jsou to nativní `<select>` seznamy, které se navzájem zužují. Až katalog naroste
(roky 1945–92, katalogových čísel i kolem 1000), budou seznamy příliš dlouhé.

K řešení:
- Nahradit je jednou sdílenou vlastní komponentou: rozbalí se po kliknutí, filtruje podle psaného
  textu, hodnotu potvrdí až výběr položky nebo Enter (ne první písmeno).
- Roky seskupit po dekádách (`<optgroup>` zkoušen, vzhled nevyhovoval; nativní seznam neumí čáry
  mezi skupinami; `appearance: base-select` funguje jen v novém Chromiu).
- Katalogová čísla seskupit podle řady (1xxx / 2xxx / 3xxx), případně po stovkách.
- Poznámka: `<input list>` (datalist) se nehodí, vypadá a chová se jinak než ostatní filtry.
