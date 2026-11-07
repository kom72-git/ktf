# Katalog TF

## Vzhled redakční poznámky

Styl se řídí konstantou `STUDY_NOTE_APPEARANCE` v
`src/utils/formatovaniTextu.jsx`. Změnou z `"editorial"` na `"original"`
lze přepnout veřejný vzhled i editor na původní CSS variantu.
Název zůstává vždy „Redakční poznámka“ a uložený text se nemění.

## Obrázky schématu tiskové formy

Při založení známky i v editaci technických údajů lze tlačítkem
„+ Přidat obrázek schématu“ zadat více cest k obrázkům. Každý obrázek má vlastní
řádek a lze jej odebrat; v detailu se sada ukládá společným tlačítkem ✓.
Náhled se při editaci průběžně aktualizuje.

Na desktopu jsou miniatury vpravo od hlavního náhledu, na mobilu pod ním.
Kliknutí na miniaturu přepne náhled, kliknutí na hlavní obrázek otevře galerii.
U jediného obrázku se miniatury nezobrazují.

Pole `schemaTF` podporuje původní řetězec i pole cest (více obrázků).
Dosavadní záznamy nevyžadují migraci. Prázdné řádky se při ukládání vynechávají.
Varianta B dědí celou sadu z A, pokud nemá vlastní schéma; hodnota `NE`
schéma i dědění skryje.



## Úkoly na později

### Obrázky ve sloučených boxech na hlavní stránce

Zvážit zobrazení více známek v jednom sloučeném boxu bez zvětšení obrázkové plochy.
Vyzkoušený vějíř z nejvýše tří obrázků (hlavní obrázek vpředu, další překryté za ním,
boční rozložení pro úzké a svislé pro široké známky) nebyl na některých známkách
dostatečně viditelný a u širokých obrázků se vrstvy překrývaly. Pokus byl z hlavní
stránky odstraněn. Před případným návratem nejdřív ověřit, že skupina skutečně obsahuje
různé dostupné obrázky, a navrhnout kompozici, která bude čitelná u obou orientací.

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
