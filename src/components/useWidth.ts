import { RefObject, useEffect, useRef, useState } from "react";

/** Observe an element's content width (ResizeObserver, SSR-safe). */
export function useWidth<T extends HTMLElement>(initial = 0): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setW(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
