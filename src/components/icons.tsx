/* Minimal inline SVG icon set — 24px viewBox, stroke inherits currentColor. */

import { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: P, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconBolt = (p: P) =>
  base(p, <path d="M13 2 4.5 13.5H11L9.5 22 19 10.5h-6.5L13 2Z" fill="currentColor" stroke="none" />);

export const IconWand = (p: P) =>
  base(
    p,
    <>
      <path d="m5 19 9.5-9.5" />
      <path d="M15.5 3.5 16 5l1.5.5L16 6l-.5 1.5L15 6l-1.5-.5L15 5l.5-1.5Z" fill="currentColor" stroke="none" />
      <path d="M20 8.5 20.4 9.7 21.6 10 20.4 10.4 20 11.6 19.6 10.4 18.4 10 19.6 9.7 20 8.5Z" fill="currentColor" stroke="none" />
      <path d="M8.5 3.8 8.8 4.8 9.8 5.1 8.8 5.4 8.5 6.4 8.2 5.4 7.2 5.1 8.2 4.8 8.5 3.8Z" fill="currentColor" stroke="none" />
    </>
  );

export const IconUpload = (p: P) =>
  base(
    p,
    <>
      <path d="M12 16V4" />
      <path d="m6.5 9.5 5.5-5.5 5.5 5.5" />
      <path d="M4 16.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2.5" />
    </>
  );

export const IconFile = (p: P) =>
  base(
    p,
    <>
      <path d="M13.5 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L13.5 3Z" />
      <path d="M13.5 3v5h5" />
    </>
  );

export const IconLayers = (p: P) =>
  base(
    p,
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m4.5 12.5 7.5 4.2 7.5-4.2" />
      <path d="m4.5 16.5 7.5 4.2 7.5-4.2" />
    </>
  );

export const IconRefresh = (p: P) =>
  base(
    p,
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3v4h-4" />
    </>
  );

export const IconArrowLeft = (p: P) =>
  base(
    p,
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  );

export const IconArrowRight = (p: P) =>
  base(
    p,
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  );

export const IconPlus = (p: P) =>
  base(
    p,
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  );

export const IconTrash = (p: P) =>
  base(
    p,
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="m6 7 1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
    </>
  );

export const IconCopy = (p: P) =>
  base(
    p,
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  );

export const IconCheck = (p: P) => base(p, <path d="m4.5 12.5 5 5L19.5 7" />);

export const IconDownload = (p: P) =>
  base(
    p,
    <>
      <path d="M12 4v12" />
      <path d="m6.5 10.5 5.5 5.5 5.5-5.5" />
      <path d="M4 17v2A1.5 1.5 0 0 0 5.5 20.5h13A1.5 1.5 0 0 0 20 19v-2" />
    </>
  );

export const IconCode = (p: P) =>
  base(
    p,
    <>
      <path d="m8 7-5 5 5 5" />
      <path d="m16 7 5 5-5 5" />
      <path d="m13.5 4-3 16" />
    </>
  );

export const IconX = (p: P) =>
  base(
    p,
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  );

export const IconChevronUp = (p: P) => base(p, <path d="m5 15 7-7 7 7" />);
export const IconChevronDown = (p: P) => base(p, <path d="m5 9 7 7 7-7" />);

export const IconPalette = (p: P) =>
  base(
    p,
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-.9 2-2 0-1.4-1-1.8-1-3 0-1.2 1-2 2.5-2H17a4 4 0 0 0 4-4c0-4-4.5-7-9-7Z" />
      <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </>
  );

export const IconSpinner = (p: P) =>
  base(
    { ...p, className: `spin ${p.className ?? ""}` },
    <path d="M12 3a9 9 0 1 1-8.6 6.3" />
  );

export const IconAlert = (p: P) =>
  base(
    p,
    <>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  );

export const IconInfo = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  );

export const IconTerminal = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3" />
      <path d="M12.5 15H17" />
    </>
  );
