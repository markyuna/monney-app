import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CurrencyCode = "EUR" | "USD" | "GBP" | "COP";

type SettingsContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  formatMoney: (value: number) => string;
  formatShortMoney: (value: number) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "monneyapp_currency";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    async function loadCurrency() {
      const savedCurrency = await AsyncStorage.getItem(STORAGE_KEY);

      if (
        savedCurrency === "EUR" ||
        savedCurrency === "USD" ||
        savedCurrency === "GBP" ||
        savedCurrency === "COP"
      ) {
        setCurrencyState(savedCurrency);
      }
    }

    loadCurrency();
  }, []);

  async function setCurrency(nextCurrency: CurrencyCode) {
    setCurrencyState(nextCurrency);
    await AsyncStorage.setItem(STORAGE_KEY, nextCurrency);
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatShortMoney(value: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      formatMoney,
      formatShortMoney,
    }),
    [currency]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}