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
import { useConfirm } from "@/hooks/useConfirm";
import {
  pickBestColor,
  createBackgroundColor,
  createLiquidGlassColors,
  createOrbColor,
} from "@/lib/utils/color";
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
    dominantColor,
    hslColor,
    coverUrl,
    mode,
    _isPlaying,
  }: {
    dominantColor: [number, number, number] | null;
    hslColor: [number, number, number] | null;
    coverUrl: string | null;
    mode: FullScreenBackgroundMode;
    _isPlaying: boolean;
  }) => {
    const showThemeColor = mode === "theme" && hslColor;
    const showCoverMask = mode === "cover" && coverUrl;
    // 液体玻璃效果在 theme 和 cover 模式下都生效（只要有主色）
    const hasLiquidGlass = !!dominantColor;

    const liquidColors = useMemo(() => {
      if (!dominantColor) return null;
      return createLiquidGlassColors(dominantColor);
    }, [dominantColor]);

    const orbColor = useMemo(() => {
      if (!dominantColor) return null;
      return createOrbColor(dominantColor);
    }, [dominantColor]);

    const orbColor2 = useMemo(() => {
      if (!dominantColor) return null;
      const [h, s, l] = dominantColor;
      return createOrbColor([h + 60, s, l]);
    }, [dominantColor]);

    const orbColor3 = useMemo(() => {
      if (!dominantColor) return null;
      const [h, s, l] = dominantColor;
      return createOrbColor([h - 40, s, l], 0.3);
    }, [dominantColor]);

    const orbColor4 = useMemo(() => {
      if (!dominantColor) return null;
      const [h, s, l] = dominantColor;
      return createOrbColor([h + 120, s * 0.6, l], 0.22);
    }, [dominantColor]);

    const dynamicStyle = useMemo(() => {
      if (!hasLiquidGlass || !liquidColors) return undefined;
      const [l1, l2, l3] = liquidColors;
      return {
        background: `
          linear-gradient(135deg,
            hsla(${l1[0]}, ${l1[1]}%, ${l1[2]}%, 0.75) 0%,
            hsla(${l2[0]}, ${l2[1]}%, ${l2[2]}%, 0.55) 50%,
            hsla(${l3[0]}, ${l3[1]}%, ${l3[2]}%, 0.75) 100%
          )
        `,
      } as React.CSSProperties;
    }, [hasLiquidGlass, liquidColors]);

    return (
      <div className="absolute inset-0 z-[-1] overflow-hidden bg-transparent">
        {/* SVG 扭曲滤镜 — 液体玻璃折射 */}
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id="glass-distortion">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015"
                numOctaves="3"
                result="noise"
                seed="2"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="6"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* 封面遮罩层 — 液体模糊（cover 模式底层） */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1500ms]",
            showCoverMask ? "opacity-100" : "opacity-0"
          )}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-[-48px] h-[calc(100%+96px)] w-[calc(100%+96px)] object-cover blur-[60px] scale-[1.15]"
            />
          )}
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 bg-linear-to-b from-black/[0.02] via-zinc-950/[0.04] to-black/15" />
        </div>

        {/* 动态液体渐变层 — 三层叠加 + mix-blend */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1500ms] ease-in-out",
            hasLiquidGlass ? "opacity-100" : "opacity-0"
          )}
          style={
            {
              ...dynamicStyle,
              opacity: showThemeColor ? 0.4 : hasLiquidGlass ? 0.35 : 0,
            } as React.CSSProperties
          }
        />
        {hasLiquidGlass && liquidColors && (
          <>
            <div
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{
                opacity: hasLiquidGlass ? 0.25 : 0,
                background: `linear-gradient(225deg,
                  hsla(${liquidColors[0][0] + 30}, ${liquidColors[0][1]}%, ${liquidColors[0][2] + 8}%, 0.4) 0%,
                  transparent 60%
                )`,
                mixBlendMode: "soft-light",
              }}
            />
            <div
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{
                opacity: hasLiquidGlass ? 0.2 : 0,
                background: `radial-gradient(ellipse at 30% 70%,
                  hsla(${liquidColors[1][0] - 20}, ${liquidColors[1][1] + 10}%, ${liquidColors[1][2] + 10}%, 0.5) 0%,
                  transparent 70%
                )`,
                mixBlendMode: "overlay",
              }}
            />
          </>
        )}

        {/* 兜底背景层 */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1500ms]",
            showThemeColor || showCoverMask || hasLiquidGlass
              ? "opacity-0"
              : "opacity-100"
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

        {/* 液体光球层 — 颜色跟随封面 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div
            className="absolute w-56 h-56 rounded-full"
            style={{
              top: "8%",
              left: "12%",
              background: orbColor
                ? `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`
                : "radial-gradient(circle, hsla(270, 60%, 50%, 0.3) 0%, transparent 70%)",
              animation: "orb-morph-1 14s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-72 h-72 rounded-full"
            style={{
              top: "45%",
              right: "8%",
              background: orbColor2
                ? `radial-gradient(circle, ${orbColor2} 0%, transparent 70%)`
                : "radial-gradient(circle, hsla(200, 70%, 45%, 0.25) 0%, transparent 70%)",
              animation: "orb-morph-2 18s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full"
            style={{
              bottom: "12%",
              left: "25%",
              background: orbColor3
                ? `radial-gradient(circle, ${orbColor3} 0%, transparent 70%)`
                : "radial-gradient(circle, hsla(300, 50%, 45%, 0.2) 0%, transparent 70%)",
              animation: "orb-morph-3 22s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-40 h-40 rounded-full"
            style={{
              top: "25%",
              left: "55%",
              background: orbColor4
                ? `radial-gradient(circle, ${orbColor4} 0%, transparent 70%)`
                : "radial-gradient(circle, hsla(180, 40%, 40%, 0.15) 0%, transparent 70%)",
              animation: "orb-morph-4 20s ease-in-out infinite",
            }}
          />
        </div>

        {/* 液体玻璃层 — backdrop-filter 模糊 + 扭曲 + 色调 + 光泽 */}
        {hasLiquidGlass && (
          <>
            {/* 扭曲模糊层 — 模糊下方的光球与渐变 */}
            <div
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                filter: "url(#glass-distortion)",
                opacity: 0.35,
              }}
            />
            {/* 色调层 — 半透明白色叠加 */}
            <div
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                opacity: showThemeColor ? 0.4 : 0.25,
              }}
            />
            {/* 光泽层 — 内阴影模拟玻璃边缘高光 */}
            <div
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out pointer-events-none"
              style={{
                boxShadow:
                  "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.12), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.06)",
                opacity: showThemeColor ? 0.35 : 0.2,
              }}
            />
          </>
        )}

        {/* 噪点层 */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none select-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />
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

  const { swatches } = useCoverColors(coverUrl);

  // 原始主色 — 用于液体玻璃渐变（高饱和、中亮度）
  const dominantColor = useMemo(() => {
    if (!swatches) return null;
    return pickBestColor(swatches);
  }, [swatches]);

  // 暗化后的背景色 — 用于封面投影、光晕等暗色效果
  const hslColor = useMemo(() => {
    if (!dominantColor) return null;
    return createBackgroundColor(dominantColor);
  }, [dominantColor]);

  const isMobile = useIsMobile();

  const { confirm, ConfirmDialog } = useConfirm();

  const playTrack = (index: number) => setCurrentIndexAndPlay(index);

  const handleClearQueue = async () => {
    if (
      await confirm({ title: "确定要清空播放列表吗？", variant: "destructive" })
    ) {
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
              compact
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
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-12 w-12 transition-all duration-300 text-white/50 hover:text-white hover:bg-white/[0.08] hover:scale-110 active:scale-90"
        onClick={handleModeToggle}
      >
        <ModeIcon isRepeat={isRepeat} isShuffle={isShuffle} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="relative z-10 h-12 w-12 text-white/60 hover:bg-white/[0.08] hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
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
            : "bg-white shadow-[0_0_35px_rgba(255,255,255,0.25),0_4px_20px_rgba(0,0,0,0.3)]"
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
        className="relative z-10 h-12 w-12 text-white/60 hover:bg-white/[0.08] hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
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
        compact={!isMobile}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 h-12 w-12 text-white/50 hover:bg-white/[0.08] hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
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
          {/* 黑胶唱片旋转环 — 改进纹理细节 */}
          <div
            className={cn(
              "absolute inset-[-10%] rounded-full",
              isPlaying ? "animate-vinyl-spin" : "animate-vinyl-spin-paused"
            )}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 15%, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.015) 75%, rgba(255,255,255,0.05) 90%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* 唱片沟纹环 */}
            <div className="absolute inset-[12%] rounded-full border border-white/[0.03]" />
            <div className="absolute inset-[18%] rounded-full border border-white/[0.025]" />
            <div className="absolute inset-[24%] rounded-full border border-white/[0.03]" />
            <div className="absolute inset-[30%] rounded-full border border-white/[0.02]" />
            <div className="absolute inset-[36%] rounded-full border border-white/[0.03]" />
            {/* 中心标签区 */}
            <div className="absolute inset-[42%] rounded-full bg-white/[0.08] border border-white/[0.08]">
              <div className="absolute inset-[30%] rounded-full bg-white/[0.06]" />
            </div>
          </div>

          {/* 封面主体 — 液体质感 */}
          <div
            className={cn(
              "relative aspect-square overflow-hidden rounded-[2rem] transition-all duration-700",
              isPlaying ? "scale-100 animate-cover-breathe" : "scale-[0.92]"
            )}
            style={{
              boxShadow: hslColor
                ? `0 35px 70px -15px hsla(${hslColor[0]}, ${hslColor[1]}%, ${Math.max(0, hslColor[2] - 25)}%, 0.55),
                   0 0 100px -25px hsla(${hslColor[0]}, ${hslColor[1]}%, ${hslColor[2]}%, 0.2),
                   inset 0 1px 0 rgba(255,255,255,0.1),
                   inset 0 -1px 0 rgba(0,0,0,0.2)`
                : `0 30px 60px -15px rgba(0, 0, 0, 0.65),
                   0 0 80px -25px rgba(255, 255, 255, 0.06),
                   inset 0 1px 0 rgba(255,255,255,0.08),
                   inset 0 -1px 0 rgba(0,0,0,0.15)`,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <MusicCover
              src={coverUrl}
              alt={currentTrack?.name}
              className="h-full w-full object-cover dark select-none touch-none"
              iconClassName="h-16 w-16 text-white/30"
            />
            {/* 顶部高光 — 更自然的弧形反光 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] via-white/[0.02] to-transparent pointer-events-none" />
            {/* 底部微弱反光 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* 封面底部彩色光晕 */}
          {hslColor && (
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[70%] h-16 rounded-full pointer-events-none transition-opacity duration-1000"
              style={{
                background: `radial-gradient(ellipse, hsla(${hslColor[0]}, ${hslColor[1]}%, ${hslColor[2]}%, 0.25) 0%, transparent 70%)`,
                filter: "blur(20px)",
                opacity: isPlaying ? 1 : 0.5,
              }}
            />
          )}
        </div>
      )}
    </div>
  );

  const drawers = (
    <>
      <ConfirmDialog />
      <QualityDrawer
        open={qualityDrawerOpen}
        onOpenChange={setQualityDrawerOpen}
        compact={!isMobile}
      />
      <PlaybackSpeedDrawer
        open={speedDrawerOpen}
        onOpenChange={setSpeedDrawerOpen}
        compact={!isMobile}
      />
      <SleepTimerDrawer
        open={sleepDrawerOpen}
        onOpenChange={setSleepDrawerOpen}
        compact={!isMobile}
      />
    </>
  );

  // Mobile: full-screen slide-up portal
  if (isMobile) {
    return createPortal(
      <div
        className={cn(
          "fixed inset-0 z-50 transition-[transform,opacity] duration-[350ms] [ease cubic-bezier(0.32,0.72,0,1)] flex flex-col will-change-transform backdrop-blur-xl",
          isFullScreen
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        <BackgroundLayer
          dominantColor={dominantColor}
          hslColor={hslColor}
          coverUrl={coverUrl}
          mode={fullScreenBackgroundMode}
          _isPlaying={isPlaying}
        />
        <header className="shrink-0 flex items-center justify-between px-6 pt-[calc(1rem+var(--safe-area-top))] pb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-white/40 hover:bg-white/[0.08] hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
            onClick={onClose}
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs tracking-widest text-white/40 hover:text-white hover:bg-white/[0.08] h-8 px-3 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] transition-all duration-300"
            onClick={() => setQualityDrawerOpen(true)}
          >
            {!showLyrics && getQualityShortLabel(quality)}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-white/40 hover:bg-white/[0.08] hover:text-white transition-all duration-300 hover:scale-110 active:scale-90"
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
        overlayClassName="backdrop-blur-xl"
        className="sm:max-w-[960px] h-[640px] p-0 bg-transparent border-0 shadow-none overflow-hidden block gap-0 rounded-2xl will-change-[transform,opacity]"
        style={{
          boxShadow: "none",
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>
          <VisuallyHidden>{currentTrack?.name || "正在播放"}</VisuallyHidden>
        </DialogTitle>
        <BackgroundLayer
          dominantColor={dominantColor}
          hslColor={hslColor}
          coverUrl={coverUrl}
          mode={fullScreenBackgroundMode}
          _isPlaying={isPlaying}
        />
        {/* 顶部渐变高光 — 液体玻璃折射 */}
        <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-20 pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:scale-110 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setQualityDrawerOpen(true)}
            className="text-xs tracking-widest text-white/40 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-300"
          >
            {getQualityShortLabel(quality)}
          </button>
        </div>
        <div className="flex h-full relative z-10">
          <div className="flex flex-col w-[420px] shrink-0 pr-6 py-6">
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
              {coverSection}
            </div>
            <div className="shrink-0 px-6 mt-4">{trackInfo}</div>
            <div className="shrink-0 px-6">{progressBar}</div>
            <div className="shrink-0">{controlButtons}</div>
          </div>
          {/* 右侧歌词面板 — 渐变分隔线 */}
          <div className="flex-1 min-w-0 relative bg-white/[0.02]">
            <div className="absolute top-[10%] bottom-[10%] left-0 w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
            <div className="h-full pl-1">
              <LyricsPanel track={currentTrack} active={isFullScreen} />
            </div>
          </div>
        </div>
        {drawers}
      </DialogContent>
    </Dialog>
  );
}
