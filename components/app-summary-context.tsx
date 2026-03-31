"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type AppSummaryState = {
  activeUserId: string | null;
  totalQuantity: number;
  totalCards: number;
  uniqueSeries: number;
};

type AppSummaryContextValue = {
  summary: AppSummaryState;
  setSummary: (summary: AppSummaryState) => void;
};

const INITIAL_SUMMARY: AppSummaryState = {
  activeUserId: null,
  totalQuantity: 0,
  totalCards: 0,
  uniqueSeries: 0,
};

const AppSummaryContext = createContext<AppSummaryContextValue | null>(null);

export function AppSummaryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [summary, setSummary] = useState<AppSummaryState>(INITIAL_SUMMARY);

  return (
    <AppSummaryContext.Provider
      value={{
        summary,
        setSummary,
      }}
    >
      {children}
    </AppSummaryContext.Provider>
  );
}

export function useAppSummary() {
  const context = useContext(AppSummaryContext);

  if (!context) {
    throw new Error("useAppSummary must be used within AppSummaryProvider.");
  }

  return context;
}
