"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { CardDescription } from './ui/card';

// This data is derived from the mock ledgers for demonstration
const chartData = [
  { name: 'Office Rent', value: 25000, fill: 'var(--color-rent)' },
  { name: 'Salaries', value: 75000, fill: 'var(--color-salaries)' },
  { name: 'Marketing', value: 12000, fill: 'var(--color-marketing)' },
  { name: 'Utilities', value: 8000, fill: 'var(--color-utilities)' },
];

const chartConfig = {
  value: {
    label: 'Amount',
  },
  rent: {
    label: 'Office Rent',
    color: 'hsl(var(--chart-1))',
  },
  salaries: {
    label: 'Salaries',
    color: 'hsl(var(--chart-2))',
  },
  marketing: {
    label: 'Marketing',
    color: 'hsl(var(--chart-3))',
  },
  utilities: {
    label: 'Utilities',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

export function DashboardChart() {
    if (chartData.length === 0) {
      return (
          <div className="flex items-center justify-center h-[280px] w-full text-muted-foreground">
              <CardDescription>No expense data for this period.</CardDescription>
          </div>
      )
  }
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="name" />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            strokeWidth={2}
          >
             {chartData.map((entry) => (
              <Cell
                key={entry.name}
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
