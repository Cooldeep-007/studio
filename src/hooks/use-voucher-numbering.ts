"use client";

import * as React from "react";
import { useFirebase } from "@/firebase";
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from "firebase/firestore";

export type NumberingMode = "auto" | "manual";

type VoucherNumberingConfig = {
  mode: NumberingMode;
  prefix: string;
};

const VOUCHER_TYPE_PREFIXES: Record<string, string> = {
  Sales: "SLS",
  Purchase: "PUR",
  Payment: "PAY",
  Receipt: "RCT",
  Journal: "JRN",
  Contra: "CNT",
  "Debit Note": "DBN",
  "Credit Note": "CRN",
  "Proforma Invoice": "PRF",
  "Adhoc Sale": "ADS",
  "Adhoc Purchase": "ADP",
};

function getCurrentFY(): string {
  const now = new Date();
  return now.getMonth() >= 3
    ? `${now.getFullYear().toString().slice(-2)}${(now.getFullYear() + 1).toString().slice(-2)}`
    : `${(now.getFullYear() - 1).toString().slice(-2)}${now.getFullYear().toString().slice(-2)}`;
}

export function useVoucherNumbering(
  firmId: string,
  companyId: string,
  voucherType: string
) {
  const { firestore } = useFirebase();
  const [mode, setModeState] = React.useState<NumberingMode>("auto");
  const [generatedNumber, setGeneratedNumber] = React.useState("");
  const [manualNumber, setManualNumber] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  const prefix = VOUCHER_TYPE_PREFIXES[voucherType] || "VCH";
  const fy = getCurrentFY();

  const settingsDocPath = React.useMemo(() => {
    if (!firmId || !companyId) return null;
    return `firms/${firmId}/companies/${companyId}/settings/voucherNumbering`;
  }, [firmId, companyId]);

  const counterDocPath = React.useMemo(() => {
    if (!firmId || !companyId) return null;
    return `firms/${firmId}/companies/${companyId}/settings/voucherCounters`;
  }, [firmId, companyId]);

  React.useEffect(() => {
    if (!firestore || !settingsDocPath) return;
    const loadConfig = async () => {
      try {
        const configDoc = await getDoc(doc(firestore, settingsDocPath));
        if (configDoc.exists()) {
          const data = configDoc.data() as Record<string, VoucherNumberingConfig>;
          const typeConfig = data[voucherType];
          if (typeConfig?.mode) {
            setModeState(typeConfig.mode);
          }
        }
      } catch (e) {
        console.error("Failed to load numbering config:", e);
      }
    };
    loadConfig();
  }, [firestore, settingsDocPath, voucherType]);

  React.useEffect(() => {
    if (!firestore || !counterDocPath) return;
    const loadNextNumber = async () => {
      setIsLoading(true);
      try {
        const counterRef = doc(firestore, counterDocPath);
        const counterDoc = await getDoc(counterRef);
        const counterKey = `${voucherType}_${fy}`;
        let nextSeq = 1;

        if (counterDoc.exists()) {
          const data = counterDoc.data();
          if (data[counterKey] !== undefined) {
            nextSeq = (data[counterKey] as number) + 1;
          }
        }

        setGeneratedNumber(`${prefix}/${fy}-${nextSeq.toString().padStart(4, "0")}`);
      } catch (e) {
        console.error("Failed to load counter:", e);
        setGeneratedNumber(`${prefix}/${fy}-${Date.now().toString().slice(-4)}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadNextNumber();
  }, [firestore, counterDocPath, voucherType, prefix, fy]);

  const claimNextNumber = React.useCallback(async (): Promise<string> => {
    if (!firestore || !counterDocPath) return generatedNumber;
    try {
      const counterRef = doc(firestore, counterDocPath);
      const counterKey = `${voucherType}_${fy}`;

      const nextNum = await runTransaction(firestore, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextSeq = 1;

        if (counterDoc.exists()) {
          const data = counterDoc.data();
          if (data[counterKey] !== undefined) {
            nextSeq = (data[counterKey] as number) + 1;
          }
        }

        transaction.set(counterRef, { [counterKey]: nextSeq }, { merge: true });
        return `${prefix}/${fy}-${nextSeq.toString().padStart(4, "0")}`;
      });

      setGeneratedNumber(nextNum);
      return nextNum;
    } catch (e) {
      console.error("Failed to claim next number:", e);
      return generatedNumber;
    }
  }, [firestore, counterDocPath, voucherType, prefix, fy, generatedNumber]);

  const setMode = React.useCallback(
    async (newMode: NumberingMode) => {
      setModeState(newMode);
      if (newMode === "manual" && !manualNumber) {
        setManualNumber(generatedNumber);
      }
      if (!firestore || !settingsDocPath) return;
      try {
        const configRef = doc(firestore, settingsDocPath);
        const configDoc = await getDoc(configRef);
        const existing = configDoc.exists() ? configDoc.data() : {};
        await setDoc(configRef, {
          ...existing,
          [voucherType]: { mode: newMode, prefix },
        });
      } catch (e) {
        console.error("Failed to save numbering config:", e);
      }
    },
    [firestore, settingsDocPath, voucherType, prefix, manualNumber, generatedNumber]
  );

  const voucherNumber = mode === "auto" ? generatedNumber : manualNumber;

  return {
    mode,
    setMode,
    voucherNumber,
    generatedNumber,
    manualNumber,
    setManualNumber,
    isLoading,
    prefix,
    claimNextNumber,
  };
}
