import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";

export interface WheelPickerProps<T> {
  options: T[];
  value: T;
  onChange: (val: T) => void;
  itemHeight?: number; // px
  visibleCount?: number; // odd number recommended
  className?: string;
  render?: (val: T) => React.ReactNode;
  loop?: boolean; // whether to simulate infinite scroll
}

export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  itemHeight = 40,
  visibleCount = 5,
  className,
  render,
  loop = true,
}: WheelPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const LOOP = 50; // large to mimic infinite
  const cycleLen = options.length * itemHeight;
  const pad = Math.floor(visibleCount / 2) * itemHeight;

  const bigList = useMemo(() => {
    if (!loop) return options;
    return Array.from({ length: LOOP * options.length }, (_, i) => options[i % options.length]);
  }, [options, loop]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idx = Math.max(0, options.findIndex((o) => o === value));
    const el = containerRef.current;
    if (!el) return;
    const initialTop = loop
      ? (Math.floor((LOOP * options.length) / 2) + idx) * itemHeight - pad
      : idx * itemHeight;
    snappingRef.current = true;
    el.scrollTop = Math.max(0, initialTop);
    window.setTimeout(() => { snappingRef.current = false; }, 50);
    setReady(true);
  }, [options, itemHeight, pad, loop]);

  // Keep scroll in the middle cycles to preserve infinite feel
  const handleScroll = () => {
    if (!loop) return;
    const el = containerRef.current;
    if (!el) return;
    const st = el.scrollTop + pad; // convert back to item top
    if (st < cycleLen) {
      snappingRef.current = true;
      el.scrollTop = st + cycleLen * Math.floor(LOOP / 2) - pad;
      // release guard on next tick
      window.setTimeout(() => { snappingRef.current = false; }, 0);
      return;
    }
    if (st > cycleLen * (LOOP - 2)) {
      snappingRef.current = true;
      el.scrollTop = st - cycleLen * Math.floor(LOOP / 2) - pad;
      window.setTimeout(() => { snappingRef.current = false; }, 0);
      return;
    }
  };

  // prevent recursive onScroll when we adjust scrollTop programmatically
  const snappingRef = useRef(false);

  // Snap to nearest item on scroll end
  const timeoutRef = useRef<number | null>(null);
  const onScroll = () => {
    if (snappingRef.current) return;
    handleScroll();
    if (snappingRef.current) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const pos = loop ? el.scrollTop + pad : el.scrollTop; // baseline
      const rawIdx = Math.round(pos / itemHeight);
      const idx = loop ? rawIdx : Math.min(options.length - 1, Math.max(0, rawIdx));
      const modIdx = loop ? ((idx % options.length) + options.length) % options.length : idx;
      const targetTop = loop ? idx * itemHeight - pad : idx * itemHeight;
      snappingRef.current = true;
      el.scrollTo({ top: targetTop, behavior: "auto" });
      window.setTimeout(() => { snappingRef.current = false; }, 120);
      const val = options[modIdx];
      if (val !== value) onChange(val);
    }, 130);
  };

  // update scroll when value changes externally
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    const pos = loop ? el.scrollTop + pad : el.scrollTop;
    const idx = Math.round(pos / itemHeight);
    const modIdx = loop ? ((idx % options.length) + options.length) % options.length : Math.min(options.length - 1, Math.max(0, idx));
    if (options[modIdx] === value) return; // already centered on value
    const targetIdx = loop
      ? Math.floor(pos / cycleLen) * options.length + options.indexOf(value)
      : options.indexOf(value);
    const targetTop = loop ? targetIdx * itemHeight - pad : targetIdx * itemHeight;
    snappingRef.current = true;
    el.scrollTo({ top: targetTop, behavior: "auto" });
    window.setTimeout(() => { snappingRef.current = false; }, 100);
  }, [value, options, itemHeight, pad, ready, loop]);

  return (
    <div
      className={cn(
        "relative select-none rounded-md border overflow-hidden",
        className
      )}
      style={{ height: visibleCount * itemHeight }}
      aria-live="polite"
      role="listbox"
    >
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="h-full overflow-y-scroll overscroll-contain"
        style={{ paddingTop: pad, paddingBottom: pad, WebkitOverflowScrolling: "touch" as any }}
      >
        <ul>
          {bigList.map((opt, i) => {
            const label = render ? render(opt) : String(opt);
            return (
              <li
                key={i}
                className="h-10 flex items-center justify-center text-base text-gray-800"
                style={{ height: itemHeight }}
              >
                {label}
              </li>
            );
          })}
        </ul>
      </div>
      {/* center highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-blue-200 bg-transparent"
        style={{ height: itemHeight }}
      />
      {/* gradient mask */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
    </div>
  );
}

export default WheelPicker;
