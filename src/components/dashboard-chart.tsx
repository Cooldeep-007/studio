
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { CardDescription } from './ui/card';

type ChartData = {
    name: string;
    value: number;
    fill: string;
}[];

interface DashboardChartProps {
    data: ChartData;
    config: ChartConfig;
}

export function DashboardChart({ data, config }: DashboardChartProps) {
    if (!data || data.length === 0) {
      return (
          <div className="flex items-center justify-center h-[280px] w-full text-muted-foreground">
              <CardDescription>No expense data for this period.</CardDescription>
          </div>
      )
    }
  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="name" />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            strokeWidth={2}
          >
             {data.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={entry.fill}
                className="focus:outline-none"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
