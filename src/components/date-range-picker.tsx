"use client"

import * as React from "react"
import { format, addDays, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns"
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

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  })
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetClick = (preset: DateRange) => {
    setDate(preset);
    setIsOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
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
                <div className="flex flex-col items-start gap-1 p-3 border-r border-border min-w-[150px]">
                    <div className="text-sm font-medium text-muted-foreground mb-2 px-2">Presets</div>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: addDays(new Date(), -6), to: new Date() })}>Last 7 Days</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: addDays(new Date(), -29), to: new Date() })}>Last 30 Days</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => {
                        const now = new Date();
                        const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
                        const lastMonthEnd = endOfMonth(lastMonthStart);
                        handlePresetClick({ from: lastMonthStart, to: lastMonthEnd });
                    }}>Last Month</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handlePresetClick({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}>This Year</Button>
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
