"use client";

import { Card, CardContent } from "@/components/ui/card";

interface MetricsCardProps {
  title: string;
  value: number;
  subtitle?: string;
}

export function MetricsCard({ title, value, subtitle }: MetricsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight mt-1">
          {value.toLocaleString()}
          <span className="text-base font-normal text-muted-foreground ml-1">人</span>
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
