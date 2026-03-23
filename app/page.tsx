"use client";

import useSWR from "swr";
import { MetricsCard } from "@/components/metrics-card";
import { OccupancyChart } from "@/components/occupancy-chart";
import { HeatmapCanvas } from "@/components/heatmap-canvas";

interface SummaryData {
  date: { island: string; food: string };
  totalVisitors: number;
  entrances: {
    name: string;
    camera: string;
    line: string;
    totalIn: number;
    totalOut: number;
  }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data: summary } = useSWR<SummaryData>("/api/summary", fetcher);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">昨日の実績</h1>
        <p className="text-sm text-muted-foreground mt-1">
          来店客数サマリーと店内動態
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard
            title="1日の来店客数（合計）"
            value={summary.totalVisitors}
            subtitle={`食品側: ${summary.date.food} / アイランド側: ${summary.date.island}`}
          />
          {summary.entrances.map((e) => (
            <MetricsCard
              key={e.camera}
              title={`${e.name} 来店客数`}
              value={e.totalIn}
              subtitle={`退店: ${e.totalOut.toLocaleString()}人`}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OccupancyChart />
        <HeatmapCanvas />
      </div>
    </div>
  );
}
