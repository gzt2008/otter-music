"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMediaTime } from "@/lib/utils/music";
import { useMusicStore } from "@/store/music-store";
import { useShallow } from "zustand/react/shallow";

interface PlayerProgressBarProps {
  className?: string;
  leftTimeSuffix?: React.ReactNode;
  centerContent?: React.ReactNode;
  onLeftTimeClick?: () => void;
  onRightTimeClick?: () => void;
  onCenterClick?: () => void;
}

export function PlayerProgressBar({
  className,
  leftTimeSuffix,
  centerContent,
  onLeftTimeClick,
  onRightTimeClick,
  onCenterClick,
}: PlayerProgressBarProps) {
  const { currentTime, duration, seek } = useMusicStore(
    useShallow((state) => ({
      currentTime: state.currentAudioTime,
      duration: state.duration,
      seek: state.seek,
    }))
  );

  const barRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragTime, setDragTime] = React.useState(0);
  const dragTimeRef = React.useRef(0);

  const currentProgress = duration ? (currentTime / duration) * 100 : 0;
  const dragProgress = duration ? (dragTime / duration) * 100 : 0;
  const displayProgress = isDragging ? dragProgress : currentProgress;

  const getPercent = (clientX: number) => {
    if (!barRef.current) return 0;
    const { left, width } = barRef.current.getBoundingClientRect();
    return Math.min(Math.max((clientX - left) / width, 0), 1);
  };

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    const p = getPercent(clientX);
    const time = p * duration;
    setDragTime(time);
    dragTimeRef.current = time;
  };

  const handleMove = React.useCallback(
    (clientX: number) => {
      const p = getPercent(clientX);
      const time = p * duration;
      setDragTime(time);
      dragTimeRef.current = time;
    },
    [duration]
  );

  const handleEnd = React.useCallback(() => {
    seek(dragTimeRef.current);
    setIsDragging(false);
  }, [seek]);

  React.useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const onMouseUp = () => handleEnd();
      const onTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        handleMove(e.touches[0].clientX);
      };
      const onTouchEnd = () => handleEnd();

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={barRef}
        className="group relative w-full py-3 cursor-pointer select-none flex items-center z-10"
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      >
        <div className="relative w-full h-1 group-hover:h-1.5 transition-all duration-300 rounded-full bg-white/[0.05] overflow-visible backdrop-blur-sm">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full flex items-center justify-end",
              !isDragging && "transition-[width] duration-150"
            )}
            style={{
              width: `${displayProgress}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.85) 100%)",
              boxShadow:
                "0 0 14px rgba(255,255,255,0.25), 0 0 6px rgba(255,255,255,0.15)",
            }}
          >
            {/* 拖拽/悬停时显示的玻璃质感圆点指示器 */}
            <div
              className={cn(
                "w-4 h-4 bg-white rounded-full transition-all duration-200 shrink-0",
                isDragging
                  ? "opacity-100 scale-110 shadow-[0_0_12px_rgba(255,255,255,0.5),0_2px_8px_rgba(0,0,0,0.3)]"
                  : "opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.4),0_2px_6px_rgba(0,0,0,0.25)]"
              )}
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 100%)",
                border: "1px solid rgba(255,255,255,0.9)",
              }}
            />
          </div>
          {/* 发光尾迹 */}
          {displayProgress > 0 && displayProgress < 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
              style={{
                left: `${displayProgress}%`,
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)",
                animation: "progress-glow 2s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>
      <div className="relative flex justify-between text-xs text-white/40 font-medium mt-2 px-0.5 tracking-wider tabular-nums">
        <span
          className={cn(
            "flex items-baseline gap-0.5",
            onLeftTimeClick &&
              "cursor-pointer hover:text-white transition-colors"
          )}
          onClick={onLeftTimeClick}
          role={onLeftTimeClick ? "button" : undefined}
          tabIndex={onLeftTimeClick ? 0 : undefined}
        >
          {formatMediaTime(isDragging ? dragTime : currentTime)}
          {leftTimeSuffix}
        </span>
        {centerContent && (
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              onCenterClick &&
                "cursor-pointer hover:text-white transition-colors"
            )}
            onClick={onCenterClick}
            role={onCenterClick ? "button" : undefined}
            tabIndex={onCenterClick ? 0 : undefined}
          >
            {centerContent}
          </span>
        )}
        <span
          className={cn(
            onRightTimeClick &&
              "cursor-pointer hover:text-white transition-colors"
          )}
          onClick={onRightTimeClick}
          role={onRightTimeClick ? "button" : undefined}
          tabIndex={onRightTimeClick ? 0 : undefined}
        >
          {formatMediaTime(duration)}
        </span>
      </div>
    </div>
  );
}
