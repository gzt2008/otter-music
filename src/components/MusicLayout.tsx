import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MusicLayoutProps {
  children: ReactNode;
  player: ReactNode;
  tabBar?: ReactNode;
  header?: ReactNode;
  hidePlayer?: boolean;
  className?: string;
  isTab?: boolean;
}

export function MusicLayout({
  children,
  player,
  tabBar,
  header,
  hidePlayer,
  className,
  isTab = true,
}: MusicLayoutProps) {
  const isDesktop = !tabBar;

  return (
    <div
      className={cn(
        "relative flex flex-col flex-1 min-w-0 h-dvh overflow-hidden bg-background",
        isTab && "pt-safe pt-11",
        isDesktop && "pt-0",
        className
      )}
    >
      {/* Header */}
      {header && <div className="shrink-0 px-5 pb-3">{header}</div>}

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative">
        <div className={cn("h-full overflow-auto scrollbar-hide")}>
          {children}
        </div>
      </div>

      {/* Now Playing Bar */}
      {!hidePlayer && (
        <div
          className={cn(
            "flex-none z-50 transition-all duration-300",
            isDesktop
              ? "relative border-t border-border/50 bg-background/95 backdrop-blur-xl"
              : "absolute left-0 right-0 bottom-(--now-playing-safe-height)"
          )}
        >
          {player}
        </div>
      )}

      {/* Tab Bar (mobile only) */}
      {isTab && tabBar && <div className="flex-none z-40">{tabBar}</div>}
    </div>
  );
}
