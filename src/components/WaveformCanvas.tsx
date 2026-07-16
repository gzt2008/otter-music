"use client";

import { useRef, useEffect } from "react";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";

interface WaveformCanvasProps {
  className?: string;
  /** full=播放页(~60px), mini=迷你栏(~16px) */
  variant?: "full" | "mini";
  /** 波形线颜色 */
  color?: string;
  /** 线条粗细 */
  lineWidth?: number;
}

/**
 * Canvas 音频波形可视化组件。
 * 从 AnalyserNode 读取实时音频时间域数据，绘制平滑贝塞尔曲线波形线。
 *
 * @requires AudioAnalyzerProvider (通过 Context 提供 AnalyserNode)
 */
export function WaveformCanvas({
  className,
  variant = "full",
  color = "rgba(255,255,255,0.6)",
  lineWidth,
}: WaveformCanvasProps) {
  const analyser = useAudioAnalyzer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const settlingRef = useRef(false);
  const lastDataRef = useRef<Uint8Array | null>(null);

  const resolvedLineWidth = lineWidth ?? (variant === "full" ? 2 : 1.5);

  // ResizeObserver 适配 canvas 物理像素
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount; // 128
    const dataArray = new Uint8Array(bufferLength);
    settlingRef.current = false;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // 读取实时音频数据
      analyser.getByteTimeDomainData(dataArray);

      // 如果处于 settling（暂停过渡），将数据向中心线插值
      if (settlingRef.current) {
        let allSettled = true;
        for (let i = 0; i < bufferLength; i++) {
          const target = 128;
          // 用存储的上一帧数据做插值，更平滑
          const prev = lastDataRef.current
            ? lastDataRef.current[i]
            : dataArray[i];
          const next = prev + (target - prev) * 0.08;
          dataArray[i] = Math.round(next);
          if (Math.abs(dataArray[i] - target) > 1) {
            allSettled = false;
          }
        }
        lastDataRef.current = new Uint8Array(dataArray);
        if (allSettled) {
          // 完全 settle，清空画布，但继续循环以响应恢复播放
          ctx.clearRect(0, 0, w, h);
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
      } else {
        lastDataRef.current = new Uint8Array(dataArray);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = resolvedLineWidth * (window.devicePixelRatio || 1);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const sliceWidth = w / (bufferLength - 1);
      let x = 0;

      // 第一个点
      const v0 = dataArray[0] / 128.0;
      let prevY = (v0 * h) / 2;
      ctx.moveTo(x, prevY);

      // 用 quadraticCurveTo 绘制平滑贝塞尔曲线
      for (let i = 1; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        const nextX = x + sliceWidth;
        const cpX = (x + nextX) / 2;
        ctx.quadraticCurveTo(x, y, cpX, (prevY + y) / 2);
        x = nextX;
        prevY = y;
      }

      ctx.stroke();

      // full 模式下添加微弱光晕
      if (variant === "full") {
        ctx.globalAlpha = 0.15;
        ctx.filter = "blur(4px)";
        ctx.stroke();
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, variant, color, resolvedLineWidth]);

  // 监听暂停状态：当 analyser 可用但不再有新数据时，进入 settling
  useEffect(() => {
    if (!analyser) return;

    const checkPlaying = () => {
      // 用 analyser 数据检测是否静音
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(buf);

      let isSilent = true;
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 128) {
          isSilent = false;
          break;
        }
      }

      if (isSilent && !settlingRef.current && lastDataRef.current) {
        settlingRef.current = true;
      } else if (!isSilent && settlingRef.current) {
        // 恢复播放：重置 settling 状态，让动画循环继续绘制波形
        settlingRef.current = false;
      }
    };

    // 每 200ms 检测一次（轻量）
    const interval = setInterval(checkPlaying, 200);
    return () => clearInterval(interval);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
