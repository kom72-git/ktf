import React from "react";
import { STAV_OPTIONS } from "../utils/stavUtils.js";

/**
 * Dropdown pro výběr stavu publikování (Interní / V přípravě / Zveřejněno).
 * @param {{ stav: string, onChange: (stav: string) => void, disabled?: boolean }} props
 */
export default function StampStavControl({ stav, onChange, disabled }) {
  return (
    <label className="hide-stamp-toggle stav-control" title="Stav publikování">
      <select
        className="stav-select"
        value={stav || 'interni'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {STAV_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
