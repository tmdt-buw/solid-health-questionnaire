import { CATEGORY_META } from "../data/questionnaire";
import type { CategoryId } from "../types";
import Icon from "./Icon";

export default function CategoryArtwork({
  category,
  compact = false,
}: {
  category: CategoryId;
  compact?: boolean;
}) {
  const meta = CATEGORY_META[category];
  return (
    <div
      className={`shq-artwork shq-artwork--${category}${compact ? " shq-artwork--compact" : ""}`}
      style={{ "--category-accent": meta.accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="shq-artwork__orb shq-artwork__orb--one" />
      <span className="shq-artwork__orb shq-artwork__orb--two" />
      <span className="shq-artwork__grid" />
      <Icon name={meta.icon} className="shq-artwork__icon" />
      <span className="shq-artwork__spark shq-artwork__spark--one">✦</span>
      <span className="shq-artwork__spark shq-artwork__spark--two">·</span>
    </div>
  );
}

