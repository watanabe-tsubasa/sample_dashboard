"use client";

import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DayData {
  date: string;
  dayOfWeek: string;
  totalIn: number;
  totalOut: number;
  peakHour: { jstHour: number; countIn: number };
}

interface DailyBarChartProps {
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DailyBarChart({ onSelectDate, selectedDate }: DailyBarChartProps) {
  const { data } = useSWR<{ days: DayData[] }>("/api/span?camera=food", fetcher);
  const days = data?.days ?? [];

  const chartData = days.map((d) => ({
    ...d,
    label: `${d.date.slice(5)} (${d.dayOfWeek})`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>日別来店客数（食品側）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold">
                        {d.date} ({d.dayOfWeek})
                      </p>
                      <p className="text-blue-600">入店: {d.totalIn.toLocaleString()}人</p>
                      <p className="text-orange-500">退店: {d.totalOut.toLocaleString()}人</p>
                      <p className="text-gray-500">
                        ピーク: {d.peakHour.jstHour}:00 ({d.peakHour.countIn}人)
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar
                dataKey="totalIn"
                name="入店 (In)"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="totalOut"
                name="退店 (Out)"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Date selection buttons as reliable alternative to chart click */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {days.map((d) => (
            <Button
              key={d.date}
              variant={d.date === selectedDate ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectDate(d.date)}
            >
              {d.date.slice(5)} ({d.dayOfWeek})
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
