// app/(tabs)/index.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import SpendingChart from "@/components/SpendingChart";
import { getCurrentUser } from "@/services/auth";
import {
  deleteTransaction,
  getUserTransactions,
  type Transaction,
} from "@/services/transactions";

type DailySummary = {
  dateKey: string;
  day: number;
  income: number;
  expense: number;
  balance: number;
};

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(today);
  }, []);

  const monthTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const date = new Date(item.transaction_date);

      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });
  }, [transactions, currentMonth, currentYear]);

  const totals = useMemo(() => {
    const income = monthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance = income - expense;
    const savingsRate =
      income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    return { income, expense, balance, savingsRate };
  }, [monthTransactions]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = lastDay.getDate();

    const summaries = new Map<string, DailySummary>();

    monthTransactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      const dateKey = formatDateKey(date);

      const existing = summaries.get(dateKey) ?? {
        dateKey,
        day: date.getDate(),
        income: 0,
        expense: 0,
        balance: 0,
      };

      if (transaction.type === "income") {
        existing.income += Number(transaction.amount);
      } else {
        existing.expense += Number(transaction.amount);
      }

      existing.balance = existing.income - existing.expense;
      summaries.set(dateKey, existing);
    });

    return [
      ...Array.from({ length: startPadding }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = formatDateKey(date);

        return (
          summaries.get(dateKey) ?? {
            dateKey,
            day,
            income: 0,
            expense: 0,
            balance: 0,
          }
        );
      }),
    ];
  }, [monthTransactions, currentMonth, currentYear]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDateKey) return [];

    return monthTransactions.filter((transaction) => {
      const dateKey = formatDateKey(new Date(transaction.transaction_date));
      return dateKey === selectedDateKey;
    });
  }, [monthTransactions, selectedDateKey]);

  const selectedDayTotals = useMemo(() => {
    const income = selectedDayTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = selectedDayTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [selectedDayTransactions]);

  const loadTransactions = useCallback(async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const data = await getUserTransactions(user.$id);
      setTransactions(data);
    } catch (error) {
      console.log(error);
      Alert.alert("Erreur", "Impossible de charger les transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const handleDeleteTransaction = useCallback((transactionId: string) => {
    Alert.alert("Supprimer", "Tu veux supprimer cette transaction ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(transactionId);

            setTransactions((current) =>
              current.filter((item) => item.$id !== transactionId)
            );
          } catch (error) {
            console.log(error);
            Alert.alert("Erreur", "Impossible de supprimer la transaction");
          }
        },
      },
    ]);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  if (loading) {
    return (
      <LinearGradient
        colors={["#08111F", "#0F172A", "#111827"]}
        style={styles.loadingScreen}
      >
        <ActivityIndicator size="large" color="#22C55E" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#08111F", "#0F172A", "#111827"]}
      style={styles.screen}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#22C55E"
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>MonneyApp</Text>
            <Text style={styles.title}>Bonjour Marcos 👋</Text>
            <Text style={styles.subtitle}>Résumé de {monthLabel}</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
        </View>

        <LinearGradient
          colors={["#22C55E", "#14B8A6", "#0EA5E9"]}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Balance du mois</Text>
          <Text style={styles.balance}>{formatMoney(totals.balance)}</Text>
          <Text style={styles.balanceText}>
            Tu peux économiser environ {totals.savingsRate}% de tes revenus ce
            mois-ci.
          </Text>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Revenus</Text>
            <Text style={styles.statValue}>{formatMoney(totals.income)}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dépenses</Text>
            <Text style={styles.statValue}>{formatMoney(totals.expense)}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Épargne</Text>
            <Text style={styles.statValue}>{totals.savingsRate}%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Actions rapides</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionButton}
            onPress={() => router.push("/add-transaction?type=income")}
          >
            <Text style={styles.actionIcon}>＋</Text>
            <Text style={styles.actionText}>Revenu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionButtonDark}
            onPress={() => router.push("/add-transaction?type=expense")}
          >
            <Text style={styles.actionIcon}>−</Text>
            <Text style={styles.actionText}>Dépense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>Calendrier mensuel</Text>
          <Text style={styles.calendarSubtitle}>
            Clique sur un jour pour voir le détail
          </Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.weekDays}>
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const hasMovement = day.income > 0 || day.expense > 0;
              const isToday =
                day.day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();

              return (
                <TouchableOpacity
                  key={day.dateKey}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDateKey(day.dateKey)}
                  style={[
                    styles.dayCell,
                    hasMovement && styles.dayCellActive,
                    isToday && styles.dayCellToday,
                    selectedDateKey === day.dateKey && styles.dayCellSelected,
                  ]}
                >
                  <Text style={styles.dayNumber}>{day.day}</Text>

                  {day.income > 0 && (
                    <Text style={styles.dayIncome}>
                      +{formatMoney(day.income)}
                    </Text>
                  )}

                  {day.expense > 0 && (
                    <Text style={styles.dayExpense}>
                      -{formatMoney(day.expense)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedDateKey && (
          <View style={styles.dayDetailsCard}>
            <View style={styles.dayDetailsHeader}>
              <View style={styles.dayDetailsHeaderText}>
                <Text style={styles.dayDetailsTitle}>
                  Détail du{" "}
                  {new Date(selectedDateKey).toLocaleDateString("fr-FR")}
                </Text>
                <Text style={styles.dayDetailsSubtitle}>
                  {selectedDayTransactions.length} transaction
                  {selectedDayTransactions.length > 1 ? "s" : ""}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setSelectedDateKey(null)}>
                <Text style={styles.closeDetails}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayDetailsStats}>
              <View style={styles.dayMiniStat}>
                <Text style={styles.dayMiniLabel}>Revenus</Text>
                <Text style={styles.dayMiniIncome}>
                  {formatMoney(selectedDayTotals.income)}
                </Text>
              </View>

              <View style={styles.dayMiniStat}>
                <Text style={styles.dayMiniLabel}>Dépenses</Text>
                <Text style={styles.dayMiniExpense}>
                  {formatMoney(selectedDayTotals.expense)}
                </Text>
              </View>

              <View style={styles.dayMiniStat}>
                <Text style={styles.dayMiniLabel}>Balance</Text>
                <Text style={styles.dayMiniBalance}>
                  {formatMoney(selectedDayTotals.balance)}
                </Text>
              </View>
            </View>

            {selectedDayTransactions.length === 0 ? (
              <Text style={styles.noDayTransactions}>
                Aucune transaction ce jour-là.
              </Text>
            ) : (
              selectedDayTransactions.map((item) => {
                const isIncome = item.type === "income";

                return (
                  <View key={item.$id} style={styles.dayTransactionRow}>
                    <View style={styles.dayTransactionInfo}>
                      <Text style={styles.dayTransactionTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.dayTransactionCategory}>
                        {item.category || (isIncome ? "Revenu" : "Dépense")}
                      </Text>
                    </View>

                    <View style={styles.dayTransactionActions}>
                      <Text
                        style={[
                          styles.dayTransactionAmount,
                          isIncome && styles.dayTransactionIncome,
                        ]}
                      >
                        {isIncome ? "+" : "-"}
                        {formatMoney(Number(item.amount))}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(item.$id)}
                      >
                        <Text style={styles.deleteTransactionText}>
                          Supprimer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <SpendingChart transactions={monthTransactions} />

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Dernières transactions</Text>
          <Text style={styles.seeAll}>Voir tout</Text>
        </View>

        <View style={styles.transactionsCard}>
          {monthTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>
                Ajoute un revenu ou une dépense pour commencer.
              </Text>
            </View>
          ) : (
            monthTransactions.slice(0, 8).map((item, index) => {
              const isIncome = item.type === "income";
              const visibleTransactions = monthTransactions.slice(0, 8);

              return (
                <View
                  key={item.$id}
                  style={[
                    styles.transactionRow,
                    index !== visibleTransactions.length - 1 &&
                      styles.transactionBorder,
                  ]}
                >
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        isIncome && styles.incomeIcon,
                      ]}
                    >
                      <Text style={styles.transactionIconText}>
                        {isIncome ? "↑" : "↓"}
                      </Text>
                    </View>

                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.transactionType}>
                        {item.category || (isIncome ? "Revenu" : "Dépense")}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      isIncome && styles.incomeAmount,
                    ]}
                  >
                    {isIncome ? "+" : "-"}
                    {formatMoney(Number(item.amount))}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.floatingButtonWrapper}
        onPress={() => router.push("/add-transaction")}
      >
        <LinearGradient
          colors={["#22C55E", "#14B8A6", "#0EA5E9"]}
          style={styles.floatingButton}
        >
          <Text style={styles.floatingButtonIcon}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 140,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  appName: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    marginTop: 6,
    textTransform: "capitalize",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  balanceCard: {
    borderRadius: 30,
    padding: 26,
    marginBottom: 22,
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "900",
    marginTop: 12,
    letterSpacing: -1,
  },
  balanceText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 280,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  actionButtonDark: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionIcon: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 4,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  calendarHeader: {
    marginBottom: 14,
  },
  calendarSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
  },
  calendarCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: "13.45%",
    minHeight: 74,
    borderRadius: 16,
    padding: 6,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  dayCellActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  dayCellToday: {
    borderColor: "#38BDF8",
  },
  dayCellSelected: {
    backgroundColor: "rgba(56,189,248,0.22)",
    borderColor: "#38BDF8",
  },
  dayNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  dayIncome: {
    color: "#4ADE80",
    fontSize: 9,
    fontWeight: "800",
  },
  dayExpense: {
    color: "#F87171",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  dayDetailsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
  },
  dayDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    gap: 12,
  },
  dayDetailsHeaderText: {
    flex: 1,
  },
  dayDetailsTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  dayDetailsSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
  closeDetails: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "800",
  },
  dayDetailsStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  dayMiniStat: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderRadius: 16,
    padding: 12,
  },
  dayMiniLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  dayMiniIncome: {
    color: "#4ADE80",
    fontSize: 13,
    fontWeight: "900",
  },
  dayMiniExpense: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "900",
  },
  dayMiniBalance: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  noDayTransactions: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  dayTransactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  dayTransactionInfo: {
    flex: 1,
  },
  dayTransactionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  dayTransactionCategory: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },
  dayTransactionActions: {
    alignItems: "flex-end",
  },
  dayTransactionAmount: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "900",
  },
  dayTransactionIncome: {
    color: "#4ADE80",
  },
  deleteTransactionText: {
    color: "#F87171",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  transactionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAll: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },
  transactionsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  transactionRow: {
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  incomeIcon: {
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  transactionIconText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  transactionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  transactionType: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 3,
  },
  transactionAmount: {
    color: "#F87171",
    fontSize: 16,
    fontWeight: "900",
  },
  incomeAmount: {
    color: "#4ADE80",
  },
  floatingButtonWrapper: {
    position: "absolute",
    right: 24,
    bottom: 34,
    width: 66,
    height: 66,
    borderRadius: 33,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  floatingButton: {
    flex: 1,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  floatingButtonIcon: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: -2,
  },
});