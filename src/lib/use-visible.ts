"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element has entered the viewport (it never goes back to false). Used to defer
 * below-the-fold requests (e.g. sparkline series) until the user can actually see them.
 */
export function useVisible<T extends Element>(margen = "200px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: margen },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, margen]);
  return [ref, visible] as const;
}
