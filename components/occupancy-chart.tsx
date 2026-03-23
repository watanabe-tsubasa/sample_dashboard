"use client";

import useSWR from "swr";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface HourData {
  jstHour: number;
  label: string;
  inFlow: number;
  outFlow: number;
  occupancy: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function OccupancyChart() {
  const { data } = useSWR<{ hours: HourData[] }>("/api/occupancy", fetcher);
  const hours = data?.hours ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>店内客数 推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hours} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={40}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as HourData;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold">{label}</p>
                      <p className="text-blue-600">店内客数: {d.occupancy}人</p>
                      <p className="text-green-600">入店: {d.inFlow}人</p>
                      <p className="text-gray-500">退店: {d.outFlow}人</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#occupancyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
