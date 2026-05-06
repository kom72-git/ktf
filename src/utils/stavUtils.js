// Utilita pro správu stavu publikování známky.
// Tři stavy: 'interni' (skryto), 'priprava' (viditelné, označené), 'zverejneno' (plně publikováno).

export const STAV_OPTIONS = [
  { value: 'interni',    label: 'Interní' },
  { value: 'priprava',   label: 'V přípravě' },
  { value: 'zverejneno', label: 'Zveřejněno' },
];

function normalizeStavValue(rawStav) {
  if (rawStav === null || rawStav === undefined) return '';
  const normalized = String(rawStav)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (!normalized) return '';

  if (normalized === 'interni' || normalized === 'internal') return 'interni';
  if (normalized === 'priprava' || normalized === 'v priprave' || normalized === 'v_priprave') return 'priprava';
  if (normalized === 'zverejneno' || normalized === 'zverejnena' || normalized === 'publikovano' || normalized === 'published') return 'zverejneno';

  return '';
}

/**
 * Odvodí stav z dat známky — s fallbackem na legacy pole `isHidden`.
 * @param {object} stamp
 * @returns {'interni'|'priprava'|'zverejneno'}
 */
export function getStavFromStamp(stamp) {
  const normalizedStav = normalizeStavValue(stamp?.stav);
  if (normalizedStav) return normalizedStav;
  return stamp?.isHidden ? 'interni' : 'zverejneno';
}

/**
 * Převede stav na hodnotu isHidden pro zpětnou kompatibilitu.
 * @param {'interni'|'priprava'|'zverejneno'} stav
 * @returns {boolean}
 */
export function stavToIsHidden(stav) {
  return stav === 'interni';
}
