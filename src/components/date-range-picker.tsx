"use client"

import * as React from "react"
import { 
    format, 
    addDays, 
    startOfYear, 
    endOfYear, 
    startOfMonth, 
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    getYear,
    getMonth,
} from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "./ui/select"
import { Separator } from "./ui/separator"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"

// Helper to get Indian financial year
const getFinancialYear = (date: Date): { start: Date; end: Date; label: string } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // In India, FY starts in April (month 3)
    if (month >= 3) {
        return { start: new Date(year, 3, 1), end: new Date(year + 1, 2, 31), label: `FY ${year}-${(year + 1).toString().slice(-2)}` };
    } else {
        return { start: new Date(year - 1, 3, 1), end: new Date(year, 2, 31), label: `FY ${year - 1}-${year.toString().slice(-2)}` };
    }
};

const financialYears = Array.from({ length: 5 }, (_, i) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - i);
    return getFinancialYear(date);
});

const quarters = [
    { label: 'Q1: Apr-Jun', value: 'q1' },
    { label: 'Q2: Jul-Sep', value: 'q2' },
    { label: 'Q3: Oct-Dec', value: 'q3' },
    { label: 'Q4: Jan-Mar', value: 'q4' },
];

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetClick = (preset: DateRange) => {
    setDate(preset);
  }

  const handlePeriodSelect = (type: 'fy' | 'quarter' | 'month', value: string) => {
      const now = new Date();
      
      if (type === 'fy') {
          const selectedFy = financialYears.find(fy => getYear(fy.start).toString() === value);
          if (selectedFy) {
              setDate({ from: selectedFy.start, to: selectedFy.end });
          }
      }
      if (type === 'quarter') {
          const currentFY = getFinancialYear(date?.from || now);
          let year = getYear(currentFY.start);
          let from: Date, to: Date;
          switch (value) {
              case 'q1': 
                from = new Date(year, 3, 1);
                to = new Date(year, 5, 30);
                break;
              case 'q2':
                from = new Date(year, 6, 1);
                to = new Date(year, 8, 30);
                break;
              case 'q3':
                from = new Date(year, 9, 1);
                to = new Date(year, 11, 31);
                break;
              case 'q4':
                from = new Date(year + 1, 0, 1);
                to = new Date(year + 1, 2, 31);
                break;
              default:
                return;
          }
           setDate({ from, to });
      }
       if (type === 'month') {
          const currentFY = getFinancialYear(date?.from || now);
          const monthIndex = parseInt(value, 10);
          const year = (monthIndex >= 3) ? getYear(currentFY.start) : getYear(currentFY.end);
          const from = startOfMonth(new Date(year, monthIndex, 1));
          const to = endOfMonth(from);
          setDate({ from, to });
      }
  }


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
            <div className="flex items-start">
                <div className="flex flex-col items-start gap-1 p-3 border-r border-border w-[220px]">
                    <div className="space-y-2 w-full">
                        <Label>Financial Year</Label>
                        <Select onValueChange={(value) => handlePeriodSelect('fy', value)} defaultValue={getYear(getFinancialYear(date?.from || new Date()).start).toString()}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select FY" />
                            </SelectTrigger>
                            <SelectContent>
                                {financialYears.map(fy => <SelectItem key={fy.label} value={getYear(fy.start).toString()}>{fy.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2 w-full mt-2">
                        <Label>Quarter</Label>
                        <Select onValueChange={(value) => handlePeriodSelect('quarter', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Quarter" />
                            </SelectTrigger>
                            <SelectContent>
                                {quarters.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2 w-full mt-2">
                        <Label>Month</Label>
                        <Select onValueChange={(value) => handlePeriodSelect('month', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({length: 12}, (_, i) => i).map(monthIndex => (
                                    <SelectItem key={monthIndex} value={monthIndex.toString()}>
                                        {format(new Date(0, monthIndex), 'MMMM')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="my-4" />
                    
                    <div className="text-sm font-medium text-muted-foreground mb-2 px-2">Presets</div>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: addDays(new Date(), -6), to: new Date() })}>Last 7 Days</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: addDays(new Date(), -29), to: new Date() })}>Last 30 Days</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => {
                        const now = new Date();
                        const lastMonthStart = startOfMonth(addDays(now, -30));
                        handlePresetClick({ from: lastMonthStart, to: endOfMonth(lastMonthStart) });
                    }}>Last Month</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}>This Calendar Year</Button>
                    
                    <Separator className="my-4" />
                    <div className="flex items-center space-x-2 p-2">
                      <Switch id="compare-mode" disabled />
                      <Label htmlFor="compare-mode">Compare Period</Label>
                    </div>
                </div>
                 <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
            </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
