"use client";

import { createPortal } from "react-dom";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LyricsPanel } from "./LyricsPanel";
import { MusicCover } from "./MusicCover";
import { PlayerProgressBar } from "./PlayerProgressBar";
import { MusicTrack } from "@/types/music";
import {
  ChevronDown,
  Heart,
  ListVideo,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  SquareArrowOutUpRight,
  ClockFading,
  X,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlayerActions } from "@/hooks/usePlayerActions";
import { usePlayerUIState } from "@/hooks/usePlayerUIState";
import { PlayerQueueDrawer } from "./PlayerQueueDrawer";
import { MusicTrackMobileMenu } from "./MusicTrackMobileMenu";
import { AddToPlaylistDrawer } from "./AddToPlaylistDrawer";
import { QualityDrawer } from "./settings/QualityDrawer";
import { PlaybackSpeedDrawer } from "./settings/PlaybackSpeedDrawer";
import { SleepTimerDrawer } from "./settings/SleepTimerDrawer";
import { downloadMusicTrack } from "@/lib/utils/download";
import { getQualityShortLabel } from "@/lib/utils/quality";
import { formatTime } from "@/lib/utils/time";
import {
  useMusicStore,
  type FullScreenBackgroundMode,
} from "@/store/music-store";
import { useShallow } from "zustand/react/shallow";
import toast from "react-hot-toast";
import { useCoverColors } from "@/hooks/useCoverColors";
import { pickBestColor, createBackgroundColor } from "@/lib/utils/color";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ModeIconProps {
  isRepeat: boolean;
  isShuffle: boolean;
}

function ModeIcon({ isRepeat, isShuffle }: ModeIconProps) {
  if (isRepeat) return <Repeat1 className="h-5 w-5" />;
  if (isShuffle) return <Shuffle className="h-5 w-5" />;
  return <Repeat className="h-5 w-5" />;
}

const BackgroundLayer = memo(
  ({
    hslColor,
    coverUrl,
    mode,
  }: {
    hslColor: [number, number, number] | null;
    coverUrl: string | null;
    mode: FullScreenBackgroundMode;
  }) => {
    const showThemeColor = mode === "theme" && hslColor;
    const showCoverMask = mode === "cover" && coverUrl;
    const dynamicStyle = useMemo(() => {
      if (!showThemeColor) return undefined;
      const [h, s, l] = hslColor;
      return {
        "--bg-h": h,
        "--bg-s": `${s}%`,
        "--bg-l": `${l}%`,
        background: `linear-gradient(to bottom,
        hsl(var(--bg-h), var(--bg-s), var(--bg-l)),
        hsl(var(--bg-h), var(--bg-s), calc(var(--bg-l) - 8%)))`,
      } as React.CSSProperties;
    }, [hslColor, showThemeColor]);

    return (
      <div className="absolute inset-0 z-[-1] overflow-hidden bg-zinc-950">
        {/* 动态颜色层 */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            showThemeColor ? "opacity-100" : "opacity-0"
          )}
          style={dynamicStyle}
        />

        {/* 封面遮罩层 */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            showCoverMask ? "opacity-100" : "opacity-0"
          )}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-[-32px] h-[calc(100%+64px)] w-[calc(100%+64px)] object-cover blur-3xl scale-110"
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-zinc-950/20 to-black/60" />
        </div>

        {/* 兜底背景层 */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            showThemeColor || showCoverMask ? "opacity-0" : "opacity-100"
          )}
        >
          <div className="absolute inset-0 bg-linear-to-b from-zinc-900 via-zinc-950 to-black" />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[60vh] opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* 浮动光球层 — 纯 CSS 动画，营造沉浸氛围 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div
            className="absolute w-48 h-48 rounded-full blur-3xl"
            style={{
              top: "10%",
              left: "15%",
              background:
                "radial-gradient(circle, hsla(270, 60%, 50%, 0.3) 0%, transparent 70%)",
              animation: "float-orb-1 12s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl"
            style={{
              top: "50%",
              right: "10%",
              background:
                "radial-gradient(circle, hsla(200, 70%, 45%, 0.25) 0%, transparent 70%)",
              animation: "float-orb-2 15s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-40 h-40 rounded-full blur-3xl"
            style={{
              bottom: "15%",
              left: "30%",
              background:
                "radial-gradient(circle, hsla(300, 50%, 45%, 0.2) 0%, transparent 70%)",
              animation: "float-orb-3 18s ease-in-out infinite",
            }}
          />
        </div>

        {/* 噪点层 */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none select-none bg-[url('data:image/svg+xml,...')]" />
      </div>
    );
  }
);
BackgroundLayer.displayName = "BackgroundLayer";

interface FullScreenPlayerProps {
  isFullScreen: boolean;
  onClose: () => void;
}

export function FullScreenPlayer({
  isFullScreen,
  onClose,
}: FullScreenPlayerProps) {
  const isMounted = useMounted();
  const {
    showLyrics,
    setShowLyrics,
    moreDrawerOpen,
    setMoreDrawerOpen,
    isAddToPlaylistOpen,
    setIsAddToPlaylistOpen,
    qualityDrawerOpen,
    setQualityDrawerOpen,
    speedDrawerOpen,
    setSpeedDrawerOpen,
    sleepDrawerOpen,
    setSleepDrawerOpen,
  } = usePlayerUIState(isFullScreen);

  const {
    queue,
    quality,
    currentIndex,
    setCurrentIndexAndPlay,
    clearQueue,
    reshuffle,
    removeFromQueue,
    playTrackAsNext,
    currentAudioUrl,
    fullScreenBackgroundMode,
    playbackSpeed,
    sleepTimerIsActive,
    sleepTimerRemaining,
    isPlaying,
    isLoading,
    isRepeat,
    isShuffle,
    togglePlay,
    toggleRepeat,
    toggleShuffle,
    coverUrl,
  } = useMusicStore(
    useShallow((state) => ({
      queue: state.queue,
      currentIndex: state.currentIndex,
      setCurrentIndexAndPlay: state.setCurrentIndexAndPlay,
      clearQueue: state.clearQueue,
      reshuffle: state.reshuffle,
      removeFromQueue: state.removeFromQueue,
      playTrackAsNext: state.playTrackAsNext,
      currentAudioUrl: state.currentAudioUrl,
      quality: state.quality,
      fullScreenBackgroundMode: state.fullScreenBackgroundMode,
      playbackSpeed: state.playbackSpeed,
      sleepTimerIsActive: state.sleepTimerIsActive,
      sleepTimerRemaining: state.sleepTimerRemaining,
      isPlaying: state.isPlaying,
      isLoading: state.isLoading,
      isRepeat: state.isRepeat,
      isShuffle: state.isShuffle,
      togglePlay: state.togglePlay,
      toggleRepeat: state.toggleRepeat,
      toggleShuffle: state.toggleShuffle,
      coverUrl: state.coverUrl,
    }))
  );

  const currentTrack = queue[currentIndex] || null;

  const {
    handleShare,
    handleToggleLike,
    isCurrentTrackFavorite,
    trackInfoPressHandlers,
  } = usePlayerActions(currentTrack, currentAudioUrl);

  const { swatches } = useCoverColors(
    coverUrl && fullScreenBackgroundMode === "theme" ? coverUrl : null
  );

  const hslColor = useMemo(() => {
    if (!swatches) return null;
    const dominant = pickBestColor(swatches);
    return dominant ? createBackgroundColor(dominant) : null;
  }, [swatches]);

  const isMobile = useIsMobile();

  const playTrack = (index: number) => setCurrentIndexAndPlay(index);

  const handleClearQueue = () => {
    if (confirm("确定要清空播放列表吗？")) {
      clearQueue();
      toast.success("播放列表已清空");
    }
  };

  const handleRemoveFromQueue = (track: MusicTrack) => {
    removeFromQueue(track.id);
  };

  if (!isMounted) return null;

  // 循环切换播放模式：none → repeat → shuffle → none
  const handleModeToggle = () => {
    if (!isShuffle && !isRepeat) toggleRepeat();
    else if (isRepeat) {
      toggleRepeat();
      toggleShuffle();
    } else toggleShuffle();
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    setCurrentIndexAndPlay((currentIndex - 1 + queue.length) % queue.length);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    setCurrentIndexAndPlay((currentIndex + 1) % queue.length);
  };

  const trackInfo = (
    <div className="flex items-center justify-between px-1 py-3 relative">
      <div
        className={cn("min-w-0 flex-1 cursor-pointer select-none")}
        onMouseDown={trackInfoPressHandlers.onMouseDown}
        onMouseUp={trackInfoPressHandlers.onMouseUp}
        onMouseLeave={trackInfoPressHandlers.onMouseLeave}
        onTouchStart={trackInfoPressHandlers.onTouchStart}
        onTouchEnd={trackInfoPressHandlers.onTouchEnd}
        title="长按复制歌曲信息"
      >
        <h2
          className={cn(
            "truncate font-semibold text-white drop-shadow-sm",
            isMobile ? "text-xl" : "text-lg"
          )}
        >
          {currentTrack?.name || "未知歌曲"}
        </h2>
        <p
          className={cn(
            "truncate text-white/50 mt-0.5",
            isMobile ? "text-sm" : "text-xs"
          )}
        >
          {currentTrack?.artist?.join(", ") || "未知歌手"}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleLike();
          }}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-all duration-300",
              isCurrentTrackFavorite
                ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                : ""
            )}
          />
        </Button>
        {currentTrack && (
          <>
            <MusicTrackMobileMenu
              track={currentTrack}
              open={moreDrawerOpen}
              onOpenChange={setMoreDrawerOpen}
              onAddToPlaylist={() => setIsAddToPlaylistOpen(true)}
              onDownload={() =>
                downloadMusicTrack(currentTrack, parseInt(quality))
              }
              isFavorite={isCurrentTrackFavorite}
              onToggleLike={() => handleToggleLike()}
              triggerClassName="h-10 w-10 text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300"
              onNavigate={() => onClose()}
            />
            <AddToPlaylistDrawer
              open={isAddToPlaylistOpen}
              onOpenChange={setIsAddToPlaylistOpen}
              track={currentTrack}
            />
          </>
        )}
      </div>
    </div>
  );

  const progressBar = (
    <PlayerProgressBar
      className="relative"
      leftTimeSuffix={
        playbackSpeed !== 1.0 ? (
          <span className="ml-1 text-[0.7em] align-sub opacity-70">
            x{playbackSpeed.toFixed(1)}
          </span>
        ) : null
      }
      centerContent={
        sleepTimerIsActive ? (
          <span className="flex items-center gap-1 text-[0.85em]">
            <ClockFading className="w-2.5 h-2.5" />
            {formatTime(sleepTimerRemaining)}
          </span>
        ) : null
      }
      onLeftTimeClick={() => setSpeedDrawerOpen(true)}
      onRightTimeClick={() => setSleepDrawerOpen(true)}
      onCenterClick={() => setSleepDrawerOpen(true)}
    />
  );

  const controlButtons = (
    <div
      className={cn(
        "flex items-center justify-between relative",
        isMobile
          ? "px-8 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]"
          : "px-6 py-4"
      )}
    >
      {/* 玻璃面板底衬 */}
      <div className="absolute inset-0 bg-white/[0.04] backdrop-blur-xl border-y border-white/[0.06] pointer-events-none" />
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-12 w-12 transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95"
        onClick={handleModeToggle}
      >
        <ModeIcon isRepeat={isRepeat} isShuffle={isShuffle} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-12 w-12 text-white/60 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
        onClick={handlePrev}
      >
        <SkipBack className="h-6 w-6 fill-current" />
      </Button>
      <Button
        size="icon"
        className={cn(
          "relative z-10 h-16 w-16 rounded-full text-black transition-all duration-300 hover:scale-105 active:scale-90",
          isPlaying
            ? "bg-white animate-glow-pulse"
            : "bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        )}
        onClick={togglePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Spinner className="h-7 w-7 text-black" />
        ) : isPlaying ? (
          <Pause className="h-7 w-7 fill-current" />
        ) : (
          <Play className="h-7 w-7 fill-current ml-1" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-12 w-12 text-white/60 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
        onClick={handleNext}
      >
        <SkipForward className="h-6 w-6 fill-current" />
      </Button>
      <PlayerQueueDrawer
        queue={queue}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        onPlay={playTrack}
        onClear={handleClearQueue}
        onReshuffle={reshuffle}
        onRemove={handleRemoveFromQueue}
        onPlayTrack={playTrackAsNext}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 h-12 w-12 text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <ListVideo className="h-5 w-5" />
          </Button>
        }
      />
    </div>
  );

  // Desktop: cover section shows static cover (no lyrics toggle — lyrics are in the right panel)
  const coverSection = (
    <div
      className="flex-1 flex flex-col items-center justify-center px-2 relative z-10 overflow-hidden"
      onClick={isMobile ? () => setShowLyrics(!showLyrics) : undefined}
      style={isMobile ? { cursor: "pointer" } : undefined}
    >
      {showLyrics ? (
        <div className="w-full h-full">
          <LyricsPanel track={currentTrack} active={isFullScreen} />
        </div>
      ) : (
        <div
          className={cn(
            "relative flex items-center justify-center",
            isMobile
              ? "w-72 max-w-[320px] aspect-square"
              : "w-64 max-w-[280px] aspect-square"
          )}
        >
          {/* 黑胶唱片旋转环 */}
          <div
            className={cn(
              "absolute inset-[-8%] rounded-full",
              isPlaying ? "animate-vinyl-spin" : "animate-vinyl-spin-paused"
            )}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.06) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* 唱片纹理环 */}
            <div className="absolute inset-[15%] rounded-full border border-white/[0.04]" />
            <div className="absolute inset-[25%] rounded-full border border-white/[0.03]" />
            <div className="absolute inset-[35%] rounded-full border border-white/[0.04]" />
            {/* 中心圆点 */}
            <div className="absolute inset-[42%] rounded-full bg-white/10 border border-white/10" />
          </div>

          {/* 封面主体 — 玻璃质感 */}
          <div
            className={cn(
              "relative aspect-square overflow-hidden rounded-3xl transition-all duration-700",
              isPlaying ? "scale-100" : "scale-[0.93]"
            )}
            style={{
              boxShadow: hslColor
                ? `0 30px 60px -12px hsla(${hslColor[0]}, ${hslColor[1]}%, ${Math.max(0, hslColor[2] - 20)}%, 0.5), 0 0 80px -20px hsla(${hslColor[0]}, ${hslColor[1]}%, ${hslColor[2]}%, 0.15)`
                : "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <MusicCover
              src={coverUrl}
              alt={currentTrack?.name}
              className="h-full w-full object-cover dark select-none touch-none"
              iconClassName="h-16 w-16 text-white/30"
            />
            {/* 顶部高光 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );

  const drawers = (
    <>
      <QualityDrawer
        open={qualityDrawerOpen}
        onOpenChange={setQualityDrawerOpen}
      />
      <PlaybackSpeedDrawer
        open={speedDrawerOpen}
        onOpenChange={setSpeedDrawerOpen}
      />
      <SleepTimerDrawer
        open={sleepDrawerOpen}
        onOpenChange={setSleepDrawerOpen}
      />
    </>
  );

  // Mobile: full-screen slide-up portal
  if (isMobile) {
    return createPortal(
      <div
        className={cn(
          "fixed inset-0 z-50 transition-transform duration-500 ease-in-out flex flex-col",
          isFullScreen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <BackgroundLayer
          hslColor={hslColor}
          coverUrl={coverUrl}
          mode={fullScreenBackgroundMode}
        />
        <header className="shrink-0 flex items-center justify-between px-6 pt-[calc(1rem+var(--safe-area-top))] pb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
            onClick={onClose}
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs tracking-widest text-white/40 hover:text-white hover:bg-white/10 h-8 px-3 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] transition-all duration-300"
            onClick={() => setQualityDrawerOpen(true)}
          >
            {!showLyrics && getQualityShortLabel(quality)}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
            onClick={handleShare}
          >
            <SquareArrowOutUpRight className="h-5 w-5" />
          </Button>
        </header>
        {coverSection}
        <div className="shrink-0 px-8 py-4 relative z-10">{trackInfo}</div>
        <div className="shrink-0 px-8 relative z-10">{progressBar}</div>
        {controlButtons}
        {drawers}
      </div>,
      document.body
    );
  }

  // Desktop: centered dialog with side-by-side layout
  return (
    <Dialog open={isFullScreen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="sm:max-w-[900px] h-[600px] p-0 bg-zinc-950/95 backdrop-blur-2xl border-white/[0.08] overflow-hidden block gap-0"
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 80px -20px rgba(123, 47, 190, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>
          <VisuallyHidden>{currentTrack?.name || "正在播放"}</VisuallyHidden>
        </DialogTitle>
        <BackgroundLayer
          hslColor={hslColor}
          coverUrl={coverUrl}
          mode={fullScreenBackgroundMode}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setQualityDrawerOpen(true)}
            className="text-xs tracking-widest text-white/40 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:bg-white/10 transition-all duration-300"
          >
            {getQualityShortLabel(quality)}
          </button>
        </div>
        <div className="flex h-full relative z-10">
          <div className="flex flex-col w-[400px] shrink-0 pr-6 py-6">
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
              {coverSection}
            </div>
            <div className="shrink-0 px-6 mt-4">{trackInfo}</div>
            <div className="shrink-0 px-6">{progressBar}</div>
            <div className="shrink-0">{controlButtons}</div>
          </div>
          <div className="flex-1 min-w-0 border-l border-white/[0.06] bg-white/[0.02]">
            <div className="h-full">
              <LyricsPanel track={currentTrack} active={isFullScreen} />
            </div>
          </div>
        </div>
        {drawers}
      </DialogContent>
    </Dialog>
  );
}
