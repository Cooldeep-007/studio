"use client";

import * as React from "react";
import { Settings2, Hash, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { NumberingMode } from "@/hooks/use-voucher-numbering";

interface VoucherNumberSettingsProps {
  mode: NumberingMode;
  setMode: (mode: NumberingMode) => void;
  voucherNumber: string;
  generatedNumber: string;
  manualNumber: string;
  setManualNumber: (value: string) => void;
  isLoading: boolean;
  isEditMode?: boolean;
  editVoucherNumber?: string;
}

export function VoucherNumberSettings({
  mode,
  setMode,
  voucherNumber,
  generatedNumber,
  manualNumber,
  setManualNumber,
  isLoading,
  isEditMode,
  editVoucherNumber,
}: VoucherNumberSettingsProps) {
  if (isEditMode) {
    return (
      <span className="font-mono text-primary text-sm">
        {editVoucherNumber}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Voucher No:</span>
      {mode === "auto" ? (
        <span className="font-mono text-primary text-sm font-medium">
          {isLoading ? "..." : voucherNumber}
        </span>
      ) : (
        <Input
          className="h-7 text-sm font-mono w-44 inline-flex"
          value={manualNumber}
          onChange={(e) => setManualNumber(e.target.value)}
          placeholder="Enter voucher number"
        />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium">Voucher Numbering</p>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as NumberingMode)}
              className="space-y-2"
            >
              <div className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="auto" id="auto" className="mt-0.5" />
                <Label htmlFor="auto" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">Automatic</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sequential numbers generated automatically
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem
                  value="manual"
                  id="manual"
                  className="mt-0.5"
                />
                <Label htmlFor="manual" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">Manual</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter voucher numbers manually
                  </p>
                </Label>
              </div>
            </RadioGroup>
            {mode === "auto" && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                Next: <span className="font-mono">{generatedNumber}</span>
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
