"use client";

import { useState } from "react";
import useSWR from "swr";
import { DailyBarChart } from "@/components/daily-bar-chart";
import { HourlyDetailChart } from "@/components/hourly-detail-chart";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface DayData {
  date: string;
  dayOfWeek: string;
  totalIn: number;
  totalOut: number;
  peakHour: { jstHour: number; countIn: number };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SpanCollectionPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data } = useSWR<{ days: DayData[] }>("/api/span?camera=food", fetcher);
  const days = data?.days ?? [];

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleClose = () => {
    setSelectedDate(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">期間集計</h1>
        <p className="text-sm text-muted-foreground mt-1">
          食品側カメラ 3/10〜3/15 の日別・時間帯別データ
        </p>
      </div>

      <DailyBarChart onSelectDate={handleSelectDate} selectedDate={selectedDate} />

      <Drawer open={!!selectedDate} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>日別詳細</DrawerTitle>
            <DrawerDescription>
              日付ボタンで切り替えできます
            </DrawerDescription>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {days.map((d) => (
                <Button
                  key={d.date}
                  variant={d.date === selectedDate ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectDate(d.date)}
                >
                  {d.date.slice(5)} ({d.dayOfWeek})
                </Button>
              ))}
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {selectedDate && <HourlyDetailChart date={selectedDate} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
