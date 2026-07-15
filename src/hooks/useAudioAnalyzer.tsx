"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useContext,
  useState,
  createContext,
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";

const AudioAnalyzerContext = createContext<AnalyserNode | null>(null);

export function useAudioAnalyzer(): AnalyserNode | null {
  return useContext(AudioAnalyzerContext);
}

interface AudioAnalyzerProviderProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  children: ReactNode;
}

/**
 * 全局唯一的 AudioContext + AnalyserNode 管理层。
 * 通过 React Context 向下传递 AnalyserNode 实例。
 */
export function AudioAnalyzerProvider({
  audioRef,
  children,
}: AudioAnalyzerProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedRef = useRef(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const connectSource = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectedRef.current) return;

    try {
      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyserNode;
      sourceRef.current = source;
      connectedRef.current = true;

      setAnalyser(analyserNode);

      // Chrome 自动播放策略: 如果 context 被 suspended，等用户交互时 resume
      if (ctx.state === "suspended") {
        const resume = () => {
          ctx.resume();
          document.removeEventListener("click", resume);
          document.removeEventListener("touchstart", resume);
        };
        document.addEventListener("click", resume);
        document.addEventListener("touchstart", resume);
      }
    } catch {
      // createMediaElementSource 只能调用一次，重复调用会报错
      console.warn("[AudioAnalyzer] Failed to create AudioContext source");
    }
  }, [audioRef]);

  // 音频元素挂载后连接 source
  useEffect(() => {
    // 延迟一帧确保 audio 元素已挂载
    const timer = setTimeout(connectSource, 0);
    return () => clearTimeout(timer);
  }, [connectSource]);

  // 清理
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const value = useMemo(() => analyser, [analyser]);

  return (
    <AudioAnalyzerContext.Provider value={value}>
      {children}
    </AudioAnalyzerContext.Provider>
  );
}
