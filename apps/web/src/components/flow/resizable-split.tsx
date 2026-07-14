"use client";

import * as React from "react";

interface ResizableSplitProps {
  /** Left / main content (the canvas). */
  left: React.ReactNode;
  /** Right / sidebar content (inspector or test panel). */
  right: React.ReactNode;
  /** Initial width of the right panel in pixels. */
  defaultRightWidth?: number;
  /** Minimum right panel width in pixels. */
  minRightWidth?: number;
  /** Maximum right panel width in pixels. */
  maxRightWidth?: number;
  /** Minimum left panel width in pixels. */
  minLeftWidth?: number;
}

/**
 * A dependency-free horizontal split. The right panel keeps a fixed pixel
 * width the user drags; the left panel (canvas) fills the rest. Styled to the
 * editor's language — a hairline ink divider with a grip that surfaces on hover.
 */
export function ResizableSplit({
  left,
  right,
  defaultRightWidth = 372,
  minRightWidth = 300,
  maxRightWidth = 560,
  minLeftWidth = 320,
}: ResizableSplitProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = React.useState(defaultRightWidth);
  const [dragging, setDragging] = React.useState(false);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  React.useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const next = rect.right - e.clientX;
      const clamped = Math.max(minRightWidth, Math.min(maxRightWidth, next));
      if (rect.width - clamped - 8 < minLeftWidth) return;
      setRightWidth(clamped);
    }
    function handleMouseUp() {
      setDragging(false);
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, minRightWidth, maxRightWidth, minLeftWidth]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
      style={{ cursor: dragging ? "col-resize" : undefined }}
    >
      {/* Left — canvas, fills remaining space */}
      <div className="h-full min-w-0 flex-1 overflow-hidden">{left}</div>

      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        className="group relative w-2 flex-shrink-0 cursor-col-resize"
      >
        <div
          className={`absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 transition-colors ${
            dragging ? "bg-forest" : "bg-ink/15 group-hover:bg-ink/40"
          }`}
        />
        <div className="absolute top-1/2 left-1/2 flex h-6 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper opacity-0 shadow-[1px_1px_0_var(--ink)] transition-opacity group-hover:opacity-100">
          <svg width="4" height="10" viewBox="0 0 4 10" className="text-ink">
            <circle cx="1" cy="2" r="0.7" fill="currentColor" />
            <circle cx="3" cy="2" r="0.7" fill="currentColor" />
            <circle cx="1" cy="5" r="0.7" fill="currentColor" />
            <circle cx="3" cy="5" r="0.7" fill="currentColor" />
            <circle cx="1" cy="8" r="0.7" fill="currentColor" />
            <circle cx="3" cy="8" r="0.7" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Right — fixed pixel width */}
      <div
        className="h-full flex-shrink-0 overflow-hidden"
        style={{ width: rightWidth }}
      >
        {right}
      </div>
    </div>
  );
}
