import { CATEGORY_META, CATEGORY_ORDER } from "../data/questionnaire";
import type { AppLanguage, CategoryScore } from "../types";
import Icon from "./Icon";

const polar = (radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: 150 + radius * Math.cos(radians), y: 150 + radius * Math.sin(radians) };
};

const arc = (radius: number, start: number, end: number) => {
  const from = polar(radius, end);
  const to = polar(radius, start);
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${end - start <= 180 ? 0 : 1} 0 ${to.x} ${to.y}`;
};

const segment = (inner: number, outer: number, start: number, end: number) => {
  const a = polar(outer, start);
  const b = polar(outer, end);
  const c = polar(inner, end);
  const d = polar(inner, start);
  return [
    `M ${a.x} ${a.y}`,
    `A ${outer} ${outer} 0 0 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${inner} ${inner} 0 0 0 ${d.x} ${d.y}`,
    "Z",
  ].join(" ");
};

export default function HealthWheel({
  scores,
  language,
}: {
  scores: CategoryScore[];
  language: AppLanguage;
}) {
  return (
    <div className="shq-wheel" role="img" aria-label={language === "de" ? "Gesundheitsrad mit fünf Kategorien" : "Health wheel with five categories"}>
      <svg viewBox="0 0 300 300">
        {CATEGORY_ORDER.map((category, index) => {
          const score = scores.find((candidate) => candidate.category === category);
          const start = -88 + index * 72;
          const end = start + 64;
          const progressEnd = start + (64 * (score?.percentage || 0)) / 100;
          const label = CATEGORY_META[category].shortLabel[language];
          const labelPoint = polar(128, start + 32);
          const iconPoint = polar(65, start + 32);
          return (
            <g key={category}>
              <path
                d={segment(34, 92, start, end)}
                fill={CATEGORY_META[category].accent}
                fillOpacity="0.88"
                stroke="#ffffff"
                strokeWidth="3"
              />
              <path d={arc(108, start, end)} stroke="#e2e8f0" strokeWidth="12" fill="none" strokeLinecap="round" />
              {progressEnd > start && (
                <path d={arc(108, start, progressEnd)} stroke={CATEGORY_META[category].accent} strokeWidth="12" fill="none" strokeLinecap="round" />
              )}
              <text
                x={iconPoint.x}
                y={iconPoint.y + 4}
                textAnchor="middle"
                className="shq-wheel__value"
              >
                {score?.percentage ?? 0}%
              </text>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                className="shq-wheel__label"
                transform={`rotate(${start + 32 > 90 && start + 32 < 270 ? start + 32 + 180 : start + 32} ${labelPoint.x} ${labelPoint.y})`}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx="150" cy="150" r="30" fill="#ffffff" stroke="#dce4ee" strokeWidth="4" />
      </svg>
      <span className="shq-wheel__heart"><Icon name="heart" /></span>
    </div>
  );
}
