"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { format, parse, isValid, startOfMonth, endOfMonth, subYears, subMonths } from "date-fns"
import { AlertTriangle } from "lucide-react"
import type { Company } from "@/lib/types"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Alert, AlertDescription } from "./ui/alert"

// --- Helper Functions ---
const getFinancialYearInfo = (refDate: Date): { start: Date; end: Date; label: string } => {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  // Financial year in India starts in April (month index 3)
  if (month >= 3) {
    return { start: new Date(year, 3, 1), end: new Date(year + 1, 2, 31), label: `FY ${year}-${(year + 1).toString().slice(-2)}` };
  } else {
    return { start: new Date(year - 1, 3, 1), end: new Date(year, 2, 31), label: `FY ${year - 1}-${year.toString().slice(-2)}` };
  }
};

const tryParseDate = (value: string): { date: Date, type: 'day' | 'month' } | null => {
  if (!value) return null;

  const dayFormats = ['dd-MM-yyyy', 'dd/MM/yyyy', 'd-M-yy', 'd/M/yy', 'yyyy-MM-dd', 'PP', 'P'];
  for (const fmt of dayFormats) {
    const parsedDate = parse(value, fmt, new Date());
    if (isValid(parsedDate) && parsedDate.getFullYear() > 1900) {
      return { date: parsedDate, type: 'day' };
    }
  }

  const monthFormats = ['MM-yyyy', 'MMM yyyy', 'MM/yyyy'];
  for (const fmt of monthFormats) {
    const parsedDate = parse(value, fmt, new Date());
    if (isValid(parsedDate) && parsedDate.getFullYear() > 1900) {
      return { date: startOfMonth(parsedDate), type: 'month' };
    }
  }

  return null;
};

// --- Component Interface ---
interface ProDateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
  company?: Company | null;
}

export function DateRangePicker({ date, setDate, className, company }: ProDateRangePickerProps) {
  const [fromString, setFromString] = React.useState<string>(date?.from ? format(date.from, 'dd-MM-yyyy') : '');
  const [toString, setToString] = React.useState<string>(date?.to ? format(date.to, 'dd-MM-yyyy') : '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFromString(date?.from ? format(date.from, 'dd-MM-yyyy') : '');
    setToString(date?.to ? format(date.to, 'dd-MM-yyyy') : '');
  }, [date]);

  const handleApply = () => {
    setError(null);
    const fromParsed = tryParseDate(fromString);
    const toParsed = tryParseDate(toString);

    if (!fromParsed || !toParsed) {
      setError("Invalid date format. Please use formats like DD-MM-YYYY or Apr 2024.");
      return;
    }

    let finalFrom = fromParsed.date;
    let finalTo = toParsed.date;

    if (fromParsed.type === 'month') {
        finalFrom = startOfMonth(fromParsed.date);
    }
     if (toParsed.type === 'month') {
        finalTo = endOfMonth(toParsed.date);
    }

    if (finalFrom > finalTo) {
      setError("'From' date cannot be after 'To' date.");
      return;
    }

    setDate({ from: finalFrom, to: finalTo });
  };

  const handlePresetChange = (value: string) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (value) {
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'thisFy':
        const currentFyDate = company?.financialYearStart ? (company.financialYearStart instanceof Date ? company.financialYearStart : (company.financialYearStart as any).toDate()) : now;
        const currentFy = getFinancialYearInfo(currentFyDate);
        from = currentFy.start;
        to = currentFy.end;
        break;
      case 'lastFy':
        const refDateForLastFy = company?.financialYearStart ? (company.financialYearStart instanceof Date ? company.financialYearStart : (company.financialYearStart as any).toDate()) : now;
        const lastFyDate = subYears(refDateForLastFy, 1);
        const lastFy = getFinancialYearInfo(lastFyDate);
        from = lastFy.start;
        to = lastFy.end;
        break;
      default:
        return;
    }
    setDate({ from, to });
  };
  
  return (
    <div className={cn("flex flex-wrap items-end gap-4 rounded-lg border p-4 shadow-sm bg-card", className)}>
        <div className="flex-grow sm:flex-shrink-0 sm:flex-grow-0 sm:w-48">
            <Label>Quick Presets</Label>
            <Select onValueChange={handlePresetChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="thisFy">This Financial Year</SelectItem>
                    <SelectItem value="lastFy">Last Financial Year</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="flex-grow space-y-1">
            <Label htmlFor="from-date">From Date</Label>
            <Input
                id="from-date"
                value={fromString}
                onChange={(e) => setFromString(e.target.value)}
                onBlur={handleApply}
                placeholder="dd-mm-yyyy"
            />
        </div>
        <div className="flex-grow space-y-1">
            <Label htmlFor="to-date">To Date</Label>
            <Input
                id="to-date"
                value={toString}
                onChange={(e) => setToString(e.target.value)}
                onBlur={handleApply}
                placeholder="dd-mm-yyyy"
            />
        </div>
         {error && (
            <div className="w-full">
              <Alert variant="destructive" className="p-2 text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
        )}
    </div>
  )
}
