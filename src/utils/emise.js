import { katalogSort } from "./katalog.js";
import { getStavFromStamp } from "./stavUtils.js";

export function getEmissionStudyPublishTime(stamps) {
  return (stamps || []).reduce((latest, stamp) => {
    if (stamp.bezStudie) return latest;
    const publishedTime = stamp.publishedAt
      ? Date.parse(stamp.publishedAt)
      : Number.parseInt(String(stamp._id || "").substring(0, 8), 16) * 1000;
    return Number.isFinite(publishedTime) ? Math.max(latest, publishedTime) : latest;
  }, 0);
}

export function getEmissionSiblings(item, stamps, isAdmin = false) {
  if (!item?.emise?.trim()) return [];
  return (stamps || []).filter(stamp => (
    stamp.idZnamky !== item.idZnamky
    && String(stamp.emise || "").trim() === item.emise.trim()
    && String(stamp.rok) === String(item.rok)
    && (isAdmin || getStavFromStamp(stamp) !== "interni")
  )).sort(katalogSort);
}