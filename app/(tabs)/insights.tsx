// app/(tabs)/explore.tsx

import { useCallback, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCurrentUser } from "@/services/auth";
import {
  getUserTransactions,
  type Transaction,
} from "@/services/transactions";

type CategorySummary = {
  name: string;
  amount: number;
  percentage: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function isCurrentMonth(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function InsightsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        setTransactions([]);
        return;
      }

      const data = await getUserTransactions(user.$id);
      setTransactions(data);
    } catch (error) {
      console.log("Error loading insights:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const monthlyTransactions = useMemo(
    () => transactions.filter((item) => isCurrentMonth(item.transaction_date)),
    [transactions]
  );

  const income = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [monthlyTransactions]
  );

  const expense = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [monthlyTransactions]
  );

  const balance = income - expense;

  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  const categorySummary = useMemo<CategorySummary[]>(() => {
    const expenses = monthlyTransactions.filter((item) => item.type === "expense");
    const totalExpense = expenses.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const grouped = expenses.reduce<Record<string, number>>((acc, item) => {
      const category = item.category?.trim() || "Autres";
      acc[category] = (acc[category] || 0) + Number(item.amount);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions]);

  const biggestCategory = categorySummary[0];

  const latestTransactions = useMemo(
    () =>
      [...monthlyTransactions]
        .sort(
          (a, b) =>
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
        )
        .slice(0, 5),
    [monthlyTransactions]
  );

  if (loading) {
    return (
      <LinearGradient colors={["#0F172A", "#111827"]} style={styles.loading}>
        <ActivityIndicator color="#F8FAFC" />
        <Text style={styles.loadingText}>Chargement des analyses...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0F172A", "#111827"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>INSIGHTS</Text>
          <Text style={styles.title}>Analyse financière</Text>
          <Text style={styles.subtitle}>{getCurrentMonthLabel()}</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.cardLabel}>Balance du mois</Text>
          <Text
            style={[
              styles.balance,
              balance < 0 ? styles.negativeText : styles.positiveText,
            ]}
          >
            {formatMoney(balance)}
          </Text>

          <View style={styles.heroStats}>
            <View>
              <Text style={styles.statLabel}>Entrées</Text>
              <Text style={styles.incomeText}>{formatMoney(income)}</Text>
            </View>

            <View>
              <Text style={styles.statLabel}>Dépenses</Text>
              <Text style={styles.expenseText}>{formatMoney(expense)}</Text>
            </View>

            <View>
              <Text style={styles.statLabel}>Épargne</Text>
              <Text style={styles.whiteText}>{savingsRate}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>Transactions</Text>
            <Text style={styles.bigNumber}>{monthlyTransactions.length}</Text>
            <Text style={styles.muted}>ce mois-ci</Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.cardLabel}>Top catégorie</Text>
            <Text style={styles.bigNumberSmall}>
              {biggestCategory?.name || "—"}
            </Text>
            <Text style={styles.muted}>
              {biggestCategory ? formatMoney(biggestCategory.amount) : "Aucune dépense"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dépenses par catégorie</Text>

          {categorySummary.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucune dépense ce mois-ci</Text>
              <Text style={styles.emptyText}>
                Ajoute tes premières transactions pour voir tes statistiques.
              </Text>
            </View>
          ) : (
            categorySummary.map((item) => (
              <View key={item.name} style={styles.categoryRow}>
                <View style={styles.categoryTop}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categoryAmount}>
                    {formatMoney(item.amount)}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(item.percentage, 100)}%` },
                    ]}
                  />
                </View>

                <Text style={styles.percentage}>{item.percentage}% du total</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derniers mouvements</Text>

          {latestTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Pas encore de mouvement</Text>
              <Text style={styles.emptyText}>
                Utilise le bouton flottant pour ajouter une transaction.
              </Text>
            </View>
          ) : (
            latestTransactions.map((item) => (
              <View key={item.$id} style={styles.transactionRow}>
                <View>
                  <Text style={styles.transactionTitle}>{item.title}</Text>
                  <Text style={styles.transactionMeta}>
                    {item.category || "Sans catégorie"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.transactionAmount,
                    item.type === "income"
                      ? styles.incomeText
                      : styles.expenseText,
                  ]}
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatMoney(Number(item.amount))}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#CBD5E1",
    fontSize: 14,
  },
  content: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 16,
    marginTop: 6,
    textTransform: "capitalize",
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  balance: {
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 22,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  incomeText: {
    color: "#22C55E",
    fontWeight: "800",
  },
  expenseText: {
    color: "#FB7185",
    fontWeight: "800",
  },
  positiveText: {
    color: "#F8FAFC",
  },
  negativeText: {
    color: "#FB7185",
  },
  whiteText: {
    color: "#F8FAFC",
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 26,
  },
  smallCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  bigNumber: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "900",
  },
  bigNumberSmall: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  muted: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  categoryRow: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  categoryAmount: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 999,
  },
  percentage: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
  },
  transactionRow: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  transactionTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  transactionMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
});