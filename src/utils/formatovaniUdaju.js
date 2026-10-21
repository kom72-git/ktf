/**
 * Formátování technických polí pro zobrazení ve view režimu.
 * Input hodnoty zůstávají beze změny – funkce se aplikují pouze při renderování.
 *
 * TECHNICKÉ ÚDAJE V DETAILU ZNÁMKY (pravidla zápisu, špatný zápis v databázi se opraví při zobrazení):
 *   datum vydání   normalizeDatumVydani / formatDatumVydaniDisplay    5. 1. 2026 (bez úvodních nul)
 *   tisková forma  formatTiskovaFormaDisplay                          1 TF 2× (4 ZP + 2 KN)
 *   nominál        formatNominalDisplay                               4× 5 Kčs
 *   rozměr         formatRozmerDisplay                                100 × 109 mm
 *   náklad         formatNakladDisplay                                96 750 ks
 *   zoubkování     formatZoubkovaniDisplay                            ŘZ 13¾ : 11½
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
 * - nahradí "x" / "X" / "×" jako oddělovač rozměrů za × s nezlomitelnými mezerami z obou stran (100 × 109 mm)
 * - doplní "mm" za poslední číselný blok, pokud tam ještě není
 * - pokud "mm" v hodnotě již je, nebude ve výsledku dvakrát
 */
export function formatRozmerDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str || !/\d/.test(str)) return str;

  const withTimes = str.replace(/([\d,.])\s*[xX×]\s*([\d,.])/g, '$1\u00a0×\u00a0$2');

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
 * Formátuje nominál pro zobrazení:
 * - násobitel se lepí k číslu a za ním je mezera: 4x5 Kčs → 4× 5 Kčs, 2x60 h → 2× 60 h
 * - mezi číslem a měnou je nezlomitelná mezera (5 Kčs, 50 h)
 * - měna se nedoplňuje; zápis bez měny zůstane bez měny
 */
export function formatNominalDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  return str
    .replace(/(\d)\s*[xX×]\s*(?=[\d,.])/g, '$1×\u00a0')
    .replace(/(\d)\s+(?=(?:Kčs|Kč|h)(?![A-Za-z\u00C0-\u017E]))/g, '$1\u00a0');
}

/**
 * Formátuje tiskovou formu pro zobrazení (např. 1 TF 2×(4ZP+2KN) → 1 TF 2× (4 ZP + 2 KN)):
 * - násobitel se lepí k číslu a za ním je mezera: 2x (…) → 2× (…), 2 x 6 AP → 2× 6 AP
 * - mezi číslem a zkratkou je nezlomitelná mezera: 4ZP → 4 ZP
 * - "+" je vždy s mezerami z obou stran: 4+2KN → 4 + 2 KN
 * - závorky bez mezer uvnitř: ( 4 ZP ) → (4 ZP)
 * - počet forem na začátku a ostatní text zůstává beze změny
 */
export function formatTiskovaFormaDisplay(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  return str
    .replace(/(\d)\s*[xX×]\s*(?=[\d(A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017E])/g, '$1×\u00a0')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/(\d)[\s\u00a0]*(?=[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017E])/g, '$1\u00a0')
    .replace(/\s{2,}/g, ' ');
}

/**
 * Normalizuje datum vydání (hodnota, která se ukládá do databáze):
 * - jednotný zápis "D. M. YYYY" bez úvodních nul, s mezerami za tečkami (5. 1. 2026)
 * Přijímá různé varianty zápisu:
 *   "18.5.1983"    → "18. 5. 1983"
 *   "1983-05-18"   → "18. 5. 1983"
 *   "05.01.2026"   → "5. 1. 2026"
 */
export function normalizeDatumVydani(value) {
  if (!value) return value;
  const str = String(value).trim();
  if (!str) return str;

  let day, month, year;

  // ISO formát: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else {
    // Český formát: D.M.YYYY nebo D. M. YYYY apod.
    const czMatch = str.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
    if (czMatch) {
      [, day, month, year] = czMatch;
    } else {
      // Nerozpoznaný formát – vrátit beze změny
      return str;
    }
  }

  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1800 || y > 2100) return str;

  return `${d}. ${m}. ${y}`;
}

/**
 * Datum vydání pro zobrazení: stejná pravidla jako normalizeDatumVydani,
 * jen mezery v zápisu "D. M. YYYY" jsou nezlomitelné, aby se datum nezalamovalo.
 */
export function formatDatumVydaniDisplay(value) {
  const normalized = normalizeDatumVydani(value);
  return typeof normalized === 'string' ? normalized.replace(/ /g, '\u00a0') : normalized;
}

/**
 * Formátuje umístění variant pro zobrazení (varianty, nejde o technické údaje):
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
