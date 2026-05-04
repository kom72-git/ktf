// Utilita pro správu stavu publikování známky.
// Tři stavy: 'interni' (skryto), 'priprava' (viditelné, označené), 'zverejneno' (plně publikováno).

export const STAV_OPTIONS = [
  { value: 'interni',    label: 'Interní' },
  { value: 'priprava',   label: 'V přípravě' },
  { value: 'zverejneno', label: 'Zveřejněno' },
];

/**
 * Odvodí stav z dat známky — s fallbackem na legacy pole `isHidden`.
 * @param {object} stamp
 * @returns {'interni'|'priprava'|'zverejneno'}
 */
export function getStavFromStamp(stamp) {
  if (stamp?.stav) return stamp.stav;
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
