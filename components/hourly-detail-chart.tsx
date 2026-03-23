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
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricsCard } from "./metrics-card";

interface HourlyData {
  jstHour: number;
  label: string;
  countIn: number;
  countOut: number;
}

interface DayDetail {
  camera: string;
  date: string;
  dayOfWeek: string;
  totalIn: number;
  totalOut: number;
  peakHour: { jstHour: number; label: string; countIn: number };
  hourly: HourlyData[];
}

interface HourlyDetailChartProps {
  date: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function HourlyDetailChart({ date }: HourlyDetailChartProps) {
  const { data } = useSWR<DayDetail>(
    `/api/span/${date}?camera=food`,
    fetcher
  );

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricsCard title="合計入店" value={data.totalIn} />
        <MetricsCard title="合計退店" value={data.totalOut} />
        <MetricsCard
          title="ピーク時間帯"
          value={data.peakHour.countIn}
          subtitle={`${data.peakHour.label} (JST)`}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">日付</p>
            <p className="text-2xl font-bold tracking-tight mt-1">
              {data.date.slice(5)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{data.dayOfWeek}曜日</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>時間帯別 入退店数</CardTitle>
          <CardDescription>
            {data.date} ({data.dayOfWeek})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as HourlyData;
                    return (
                      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold">{label}</p>
                        <p className="text-blue-600">入店: {d.countIn}人</p>
                        <p className="text-orange-500">退店: {d.countOut}人</p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <ReferenceLine
                  x={data.peakHour.label}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: "Peak", fill: "#ef4444", fontSize: 11 }}
                />
                <Bar
                  dataKey="countIn"
                  name="入店 (In)"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="countOut"
                  name="退店 (Out)"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
