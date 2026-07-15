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
        <div className={cn("h-full")}>{children}</div>
        {/* Desktop: floating bottom player (absolute to enable backdrop-blur over content) */}
        {!hidePlayer && isDesktop && (
          <div className="absolute bottom-2 left-2 right-2 z-50">
            <div className="rounded-2xl bg-background/40 backdrop-blur-xl border border-white/[0.08] shadow-lg overflow-hidden">
              {player}
            </div>
          </div>
        )}
      </div>

      {/* Now Playing Bar (mobile) */}
      {!hidePlayer && !isDesktop && (
        <div className="flex-none z-50 transition-all duration-300 absolute left-0 right-0 bottom-(--now-playing-safe-height)">
          {player}
        </div>
      )}

      {/* Tab Bar (mobile only) */}
      {isTab && tabBar && <div className="flex-none z-40">{tabBar}</div>}
    </div>
  );
}
