import type { SVGProps } from "react";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "close"
  | "external"
  | "heart"
  | "info"
  | "lock"
  | "movement"
  | "nutrition"
  | "mental"
  | "sleep"
  | "social"
  | "pod"
  | "restart";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export default function Icon({ name, ...props }: IconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case "arrow-left":
      return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "external":
      return <svg {...common}><path d="M14 5h5v5M10 14 19 5M19 13v6H5V5h6" /></svg>;
    case "heart":
      return <svg {...common}><path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" /><path d="M5.5 12h3l1.5-3 3 7 1.5-4h4" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>;
    case "lock":
      return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
    case "movement":
      return <svg {...common}><circle cx="12" cy="5" r="2" /><path d="m9 22 1-6-3-2 2-5 4-1 3 4 3 1M10 10l4 3-1 3 4 6" /></svg>;
    case "nutrition":
      return <svg {...common}><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 2 4 6 0 9" /></svg>;
    case "mental":
      return <svg {...common}><path d="M9 19c-3 0-5-2-5-5 0-2 1-3 2-4 0-4 3-7 7-7s7 3 7 7c0 3-2 5-5 5v5" /><path d="M9 9c1-2 4-2 5 0M8 14c2 1 4 1 6 0" /></svg>;
    case "sleep":
      return <svg {...common}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /><path d="m16 4 .5 1.5L18 6l-1.5.5L16 8l-.5-1.5L14 6l1.5-.5L16 4Z" /></svg>;
    case "social":
      return <svg {...common}><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 15c3.5-1 6 1 6.5 4" /></svg>;
    case "pod":
      return <svg {...common}><path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>;
    case "restart":
      return <svg {...common}><path d="M4 4v6h6M20 20v-6h-6" /><path d="M5.5 15a8 8 0 0 0 13-6M18.5 9a8 8 0 0 0-13 6" /></svg>;
  }
}

