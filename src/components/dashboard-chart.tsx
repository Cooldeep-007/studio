
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
    totalValue: number;
}

export function DashboardChart({ data, config, totalValue }: DashboardChartProps) {
    if (!data || data.length === 0) {
      return (
          <div className="flex items-center justify-center h-[250px] w-full text-muted-foreground">
              <CardDescription>No expense data for this period.</CardDescription>
          </div>
      )
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="relative w-full h-[250px]">
            <ChartContainer config={config} className="h-full w-full">
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
                        innerRadius={80}
                        outerRadius={100}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold tracking-tighter">{formatCurrency(totalValue)}</p>
                </div>
            </div>
        </div>
    );
}
