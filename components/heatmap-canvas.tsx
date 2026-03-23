"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface HeatmapData {
  date: string;
  camera: string;
  maxValue: number;
  grid: number[][];
  activeRegion: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  thumbnailPath: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function HeatmapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data } = useSWR<HeatmapData>("/api/heatmap", fetcher);
  
  const getHeatmapColor = (t: number, alpha: number) => {
    const stops = [
      [0, 120, 255],  // 青
      [0, 180, 0],    // 緑
      [255, 220, 0],  // 黄
      [255, 0, 0],    // 赤
    ];

    const clamped = Math.max(0, Math.min(1, t));
    const scaled = clamped * (stops.length - 1);
    const lo = Math.floor(scaled);
    const hi = Math.min(lo + 1, stops.length - 1);
    const f = scaled - lo;

    const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * f);
    const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * f);
    const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * f);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const drawHeatmap = useCallback(
    (hd: HeatmapData, img: HTMLImageElement, baseOpacity: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw thumbnail background
      ctx.drawImage(img, 0, 0, size, size);

      // Overlay: cells with HIGH traffic get high opacity (opaque overlay hides the background),
      // cells with LOW traffic stay transparent (background line visible).
      // Cells with value 0 are skipped entirely (fully transparent = background visible).
      const cellW = size / 64;
      const cellH = size / 64;

      for (let r = 0; r < 64; r++) {
        for (let c = 0; c < 64; c++) {
          const val = hd.grid[r][c];
          if (val === 0) continue;

          const normalizedVal = val / hd.maxValue;
          // Opacity curve: red/yellow/green (0.33~1.0) = gradual decrease (1.0 -> 0.5),
          // blue range (0~0.33) = steep drop (0.5 -> 0.1), minimum 0.1
          let cellOpacity: number;
          if (normalizedVal >= 0.33) {
            // Gradual: maps 0.33..1.0 to 0.5..1.0
            cellOpacity = 0.5 + ((normalizedVal - 0.33) / 0.67) * 0.5;
          } else {
            // Steep: maps 0..0.33 to 0.1..0.5
            cellOpacity = 0.1 + (normalizedVal / 0.33) * 0.4;
          }
          cellOpacity *= baseOpacity;

          // Use a single dark color so the overlay acts as a "mask"
          // ctx.fillStyle = `rgba(15, 15, 40, ${cellOpacity})`;
          ctx.fillStyle = getHeatmapColor(cellOpacity, cellOpacity);
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    },
    []
  );

  // Load image when data arrives
  useEffect(() => {
    if (!data) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = data.thumbnailPath;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [data]);

  // Redraw when opacity or image changes
  useEffect(() => {
    if (data && imageRef.current && imageLoaded) {
      drawHeatmap(data, imageRef.current, opacity);
    }
  }, [opacity, data, imageLoaded, drawHeatmap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>通過ヒートマップ（アイランド側）</CardTitle>
        <p className="text-sm text-muted-foreground">
          通行が多いラインほど透過（背景が見える）、少ないエリアほど薄く表示
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            className="rounded-lg border max-w-full"
            style={{ imageRendering: "auto" }}
          />
          <div className="flex items-center gap-3 w-full max-w-xs">
            <span className="text-xs text-muted-foreground whitespace-nowrap">透過度</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          {/* Color scale legend */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">通行少（透過：青）</span>
            <div
              className="h-3 w-32 rounded"
              style={{
                background:
                   "linear-gradient(to right, rgba(0,120,255,0.1), rgba(0,180,0,0.5), rgba(255,220,0,0.75), rgba(255,0,0,1))",
              }}
            />
            <span className="text-xs text-muted-foreground">通行大（赤）</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
