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

import { getCurrentUser } from "@/services/auth";
import { getUserTransactions, type Transaction } from "@/services/transactions";
import SpendingChart from "@/components/SpendingChart";

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    return { income, expense, balance, savingsRate };
  }, [transactions]);

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
      <LinearGradient colors={["#08111F", "#0F172A", "#111827"]} style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#22C55E" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#08111F", "#0F172A", "#111827"]} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#22C55E"
            onRefresh={() => {
              setRefreshing(true);
              loadTransactions();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>MonneyApp</Text>
            <Text style={styles.title}>Bonjour Marcos 👋</Text>
            <Text style={styles.subtitle}>Voici ton résumé du mois.</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
        </View>

        <LinearGradient colors={["#22C55E", "#14B8A6", "#0EA5E9"]} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance disponible</Text>
          <Text style={styles.balance}>{formatMoney(totals.balance)}</Text>
          <Text style={styles.balanceText}>
            Tu peux économiser environ {totals.savingsRate}% de tes revenus ce mois-ci.
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
        
        <SpendingChart transactions={transactions} />

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Dernières transactions</Text>
          <Text style={styles.seeAll}>Voir tout</Text>
        </View>

        <View style={styles.transactionsCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>
                Ajoute un revenu ou une dépense pour commencer.
              </Text>
            </View>
          ) : (
            transactions.map((item, index) => {
              const isIncome = item.type === "income";

              return (
                <View
                  key={item.$id}
                  style={[
                    styles.transactionRow,
                    index !== transactions.length - 1 && styles.transactionBorder,
                  ]}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIcon, isIncome && styles.incomeIcon]}>
                      <Text style={styles.transactionIconText}>{isIncome ? "↑" : "↓"}</Text>
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

                  <Text style={[styles.transactionAmount, isIncome && styles.incomeAmount]}>
                    {isIncome ? "+" : "-"}
                    {formatMoney(Number(item.amount))}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 120,
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
    marginBottom: 14,
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
});