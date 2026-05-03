/**
 * Formátování technických polí pro zobrazení ve view režimu.
 * Input hodnoty zůstávají beze změny – funkce se aplikují pouze při renderování.
 */

/**
 * Normalizuje oddělovače tisíců v číselném řetězci.
 * Odstraní stávající mezery uvnitř číselných skupin a vloží nezlomitelnou mezeru (\u00a0)
 * po každých 3 číslicích zprava.
 */
function normalizeThousands(numStr) {
  const digits = numStr.replace(/\s+/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/**
 * Formátuje hodnotu nákladu pro zobrazení:
 * - normalizuje oddělovače tisíců (mezery → \u00a0)
 * - doplní "ks" za první číselný blok, pokud tam ještě není
 * - pokud "ks" v hodnotě již je, nebude ve výsledku dvakrát
 */
export function formatNakladDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str || !/^\d/.test(str)) return str;

  const normalized = str.replace(/\d+(?:\s+\d+)*/g, (match) => normalizeThousands(match));

  if (/\bks\b/i.test(normalized)) return normalized;

  return normalized.replace(/^\d+(?:[\u00a0\s]+\d+)*/, (match) => match + '\u00a0ks');
}

/**
 * Formátuje hodnotu rozměru pro zobrazení:
 * - nahradí "x" / "X" jako oddělovač rozměrů za typografický znak ×
 * - doplní "mm" za poslední číselný blok, pokud tam ještě není
 * - pokud "mm" v hodnotě již je, nebude ve výsledku dvakrát
 */
export function formatRozmerDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str || !/\d/.test(str)) return str;

  // Nahradit "x" / "X" mezi číslicemi (nebo desetinnou čárkou/tečkou) za "×" (bez mezer)
  const withTimes = str.replace(/([\d,.])\s*[xX]\s*([\d,.])/g, '$1×$2');

  if (/\bmm\b/i.test(withTimes)) return withTimes;

  // Doplníme "mm" za poslední číslici / číselnou skupinu na konci řetězce
  return withTimes.replace(/([\d,.][\s\u00a0]*)$/, (match) => match.trimEnd() + '\u00a0mm');
}

// Mapa textových zlomků na Unicode znaky
const FRACTION_MAP = {
  '1/4': '¼',
  '1/2': '½',
  '3/4': '¾',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

/**
 * Formátuje hodnotu zoubkování pro zobrazení:
 * - nahradí textové zlomky (1/2, 3/4 …) za Unicode znaky (½, ¾ …)
 * - odstraní mezeru mezi celým číslem a zlomkem (13 ¾ → 13¾)
 * - normalizuje mezery kolem dvojtečky (13¾:11½ → 13¾ : 11½)
 * - zajistí mezeru mezi písmennou zkratkou a číslem (ŘZ13¾ → ŘZ 13¾)
 */
export function formatZoubkovaniDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  // Nahradit textové zlomky za Unicode
  const withFractions = str.replace(/\d\/\d/g, (match) => FRACTION_MAP[match] ?? match);

  // Odstranit mezeru mezi celým číslem a Unicode zlomkem (13 ¾ → 13¾)
  const withNoBetween = withFractions.replace(/(\d)\s+([¼½¾⅓⅔⅕⅖⅗⅘⅛⅜⅝⅞])/g, '$1$2');

  // Normalizovat mezery kolem dvojtečky – oddělovač zoubkování (13¾:11½ → 13¾ : 11½)
  const withColon = withNoBetween.replace(/\s*:\s*/g, ' : ');

  // Zajistit mezeru mezi písmennou zkratkou a číslem (ŘZ13 → ŘZ 13)
  return withColon.replace(/([A-Za-z\u00C0-\u017E])(\d)/g, '$1 $2');
}

/**
 * Formátuje umístění variant pro zobrazení:
 * - zajistí mezeru mezi písmennou zkratkou a číslem (ZP1 → ZP 1)
 * - ponechá rozsah se spojovníkem bez mezer (ZP 1-10)
 */
export function formatVariantLocationDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  const withLetterNumberSpace = str.replace(/([A-Za-z\u00C0-\u017E])(\d)/g, '$1 $2');

  // Normalizace spojovníku v rozsazích: 1 - 10 -> 1-10
  return withLetterNumberSpace.replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
}

/**
 * Nahradí klasické x/X za typografické × bez úpravy mezer.
 * Příklady: 2x2 -> 2×2, 2x (2 AP + 25 ZP) -> 2× (2 AP + 25 ZP)
 */
function normalizeTimesBetweenNumbers(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  return str.replace(/(\d\s*)[xX](\s*)(?=\d|\(|[A-Za-z\u00C0-\u017E])/g, '$1×$2');
}

function normalizeTimesTightBetweenNumbers(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  // Nominal: mezi číselnými částmi držet zápis bez mezer (4x1,60 -> 4×1,60)
  return str.replace(/(\d)\s*[xX]\s*(?=[\d,.])/g, '$1×');
}

export function formatNominalDisplay(value) {
  return normalizeTimesTightBetweenNumbers(value);
}

export function formatTiskovaFormaDisplay(value) {
  return normalizeTimesBetweenNumbers(value);
}

export function formatDateTimeDisplay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
