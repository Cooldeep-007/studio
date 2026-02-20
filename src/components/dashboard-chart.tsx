"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const chartData = [
  { group: 'Assets', total: 1015000, fill: 'var(--color-assets)' },
  { group: 'Liabilities', total: 1025000, fill: 'var(--color-liabilities)' },
  { group: 'Income', total: 10000, fill: 'var(--color-income)' },
  { group: 'Expense', total: 25000, fill: 'var(--color-expense)' },
];

const chartConfig = {
  total: {
    label: 'Total',
  },
  assets: {
    label: 'Assets',
    color: 'hsl(var(--chart-2))',
  },
  liabilities: {
    label: 'Liabilities',
    color: 'hsl(var(--chart-5))',
  },
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-1))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export function DashboardChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0}}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="group"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="total" radius={8} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
