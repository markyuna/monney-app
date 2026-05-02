// components/SpendingChart.tsx

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Transaction } from "@/services/transactions";

type Props = {
  transactions: Transaction[];
};

export default function SpendingChart({ transactions }: Props) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const max = Math.max(income, expense, 1);

    return {
      income,
      expense,
      balance: income - expense,
      incomePercent: Math.max((income / max) * 100, income > 0 ? 8 : 0),
      expensePercent: Math.max((expense / max) * 100, expense > 0 ? 8 : 0),
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyTitle}>Aucune donnée ce mois-ci</Text>
        <Text style={styles.emptyText}>
          Ajoute un revenu ou une dépense pour voir l’analyse.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Revenus</Text>
          <Text style={styles.incomeAmount}>{formatMoney(totals.income)}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Dépenses</Text>
          <Text style={styles.expenseAmount}>{formatMoney(totals.expense)}</Text>
        </View>
      </View>

      <View style={styles.chartGroup}>
        <View style={styles.barHeader}>
          <Text style={styles.barLabel}>Revenus</Text>
          <Text style={styles.barValue}>{formatMoney(totals.income)}</Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              styles.incomeBar,
              { width: `${totals.incomePercent}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.chartGroup}>
        <View style={styles.barHeader}>
          <Text style={styles.barLabel}>Dépenses</Text>
          <Text style={styles.barValue}>{formatMoney(totals.expense)}</Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              styles.expenseBar,
              { width: `${totals.expensePercent}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Résultat du mois</Text>
        <Text
          style={[
            styles.balanceValue,
            totals.balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
          ]}
        >
          {formatMoney(totals.balance)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    gap: 18,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  incomeAmount: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "900",
  },
  expenseAmount: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "900",
  },
  chartGroup: {
    gap: 8,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  barValue: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },
  barTrack: {
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  incomeBar: {
    backgroundColor: "#22C55E",
  },
  expenseBar: {
    backgroundColor: "#EF4444",
  },
  balanceBox: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 16,
  },
  balanceLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "900",
  },
  positiveBalance: {
    color: "#22C55E",
  },
  negativeBalance: {
    color: "#FCA5A5",
  },
  emptyChart: {
    marginTop: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 18,
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 20,
  },
});