/* Shareable deck links — the deck JSON rides in the URL hash. */

import { Deck } from "./types";

function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(b: string): string {
  const norm = b.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function deckShareUrl(deck: Deck): string {
  const base = window.location.href.split("#")[0];
  return `${base}#d=${toB64(JSON.stringify(deck))}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function readDeckFromHash(): Deck | null {
  try {
    const m = window.location.hash.match(/^#d=(.+)$/);
    if (!m) return null;
    const parsed = JSON.parse(fromB64(decodeURIComponent(m[1])));
    if (
      parsed &&
      typeof parsed.title === "string" &&
      Array.isArray(parsed.slides) &&
      parsed.slides.length > 0 &&
      typeof parsed.slides[0].title === "string"
    ) {
      return parsed as Deck;
    }
    return null;
  } catch {
    return null;
  }
}
