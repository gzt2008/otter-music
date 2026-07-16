"use client";

import { useRef, useEffect, type RefObject } from "react";
import { useMusicStore } from "@/store/music-store";
import { useMusicCover } from "@/hooks/useMusicCover";
import { useSeekHandler } from "@/hooks/useSeekHandler";
import { useAudioPlaybackControl } from "@/hooks/useAudioPlaybackControl";
import { useMediaSessionIntegration } from "@/hooks/useMediaSessionIntegration";
import { useAudioEventHandlers } from "@/hooks/useAudioEventHandlers";
import { useAudioTrackLoader } from "@/hooks/useAudioTrackLoader";
import { useSleepTimer } from "@/hooks/useSleepTimer";

interface GlobalMusicPlayerProps {
  audioRef: RefObject<HTMLAudioElement | null>;
}

export function GlobalMusicPlayer({ audioRef }: GlobalMusicPlayerProps) {
  const currentTrack = useMusicStore((s) => s.queue[s.currentIndex]);
  const setCoverUrl = useMusicStore((s) => s.setCoverUrl);
  const coverUrl = useMusicCover(currentTrack);

  useEffect(() => {
    setCoverUrl(coverUrl);
  }, [coverUrl, setCoverUrl]);

  const isSwitchingTrackRef = useRef(false);
  const hasRecordedRef = useRef(false);

  useSleepTimer(audioRef);
  useSeekHandler(audioRef);
  useAudioTrackLoader(audioRef, isSwitchingTrackRef, hasRecordedRef);
  useAudioPlaybackControl(audioRef, isSwitchingTrackRef);
  useAudioEventHandlers(audioRef, isSwitchingTrackRef, hasRecordedRef);
  useMediaSessionIntegration(audioRef, coverUrl);

  return (
    <audio
      ref={audioRef}
      crossOrigin="anonymous"
      className="sr-only"
      preload="auto"
      playsInline
    />
  );
}
