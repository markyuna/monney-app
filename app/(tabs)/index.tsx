// app/(tabs)/index.tsx

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
} from "react-native";

import SpendingChart from "@/components/SpendingChart";
import { getCurrentUser } from "@/services/auth";
import {
  createTransaction,
  deleteTransaction,
  getUserTransactions,
  type Transaction,
} from "@/services/transactions";

type TransactionType = "income" | "expense";

type DailySummary = {
  dateKey: string;
  day: number;
  income: number;
  expense: number;
  balance: number;
};

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(new Date()));

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatShortMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const selectedDate = useMemo(
    () => new Date(`${selectedDateKey}T12:00:00.000Z`),
    [selectedDateKey]
  );

  const monthLabel = useMemo(() => getMonthLabel(visibleMonth), [visibleMonth]);

  const changeMonth = (direction: number) => {
    setVisibleMonth((current) => {
      const nextMonth = new Date(
        current.getFullYear(),
        current.getMonth() + direction,
        1
      );

      setSelectedDateKey(getDateKey(nextMonth));
      return nextMonth;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(getDateKey(today));
  };

  const calendarSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 28 && Math.abs(gestureState.dy) < 18;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -55) {
          changeMonth(1);
        }
  
        if (gestureState.dx > 55) {
          changeMonth(-1);
        }
      },
    })
  ).current;

  const visibleMonthTransactions = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();

    return transactions.filter((item) => {
      const transactionDate = new Date(item.transaction_date);

      return (
        transactionDate.getFullYear() === year &&
        transactionDate.getMonth() === month
      );
    });
  }, [transactions, visibleMonth]);

  const totals = useMemo(() => {
    const income = visibleMonthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expense = visibleMonthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, savingsRate };
  }, [visibleMonthTransactions]);

  const calendarDays = useMemo<DailySummary[]>(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month, day);
      const dateKey = getDateKey(date);

      const dayTransactions = transactions.filter(
        (item) => getDateKey(new Date(item.transaction_date)) === dateKey
      );

      const income = dayTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const expense = dayTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      return {
        dateKey,
        day,
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [transactions, visibleMonth]);

  const selectedDayTransactions = useMemo(() => {
    return transactions.filter(
      (item) => getDateKey(new Date(item.transaction_date)) === selectedDateKey
    );
  }, [transactions, selectedDateKey]);

  const topExpense = useMemo(() => {
    const expenses = visibleMonthTransactions.filter(
      (item) => item.type === "expense"
    );

    if (expenses.length === 0) return null;

    return expenses.reduce((highest, current) =>
      Number(current.amount) > Number(highest.amount) ? current : highest
    );
  }, [visibleMonthTransactions]);

  const insightText = useMemo(() => {
    if (visibleMonthTransactions.length === 0) {
      return "Commence à ajouter tes mouvements pour débloquer tes insights.";
    }

    if (totals.balance > 0) {
      return `Tu es positif ce mois-ci avec ${formatShortMoney(
        totals.balance
      )} disponibles.`;
    }

    if (totals.balance < 0) {
      return `Attention, tes dépenses dépassent tes revenus de ${formatShortMoney(
        Math.abs(totals.balance)
      )}.`;
    }

    return "Ton mois est parfaitement équilibré.";
  }, [visibleMonthTransactions.length, totals.balance]);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const openModal = () => {
    setModalVisible(true);
    setSelectedType(null);
    setTitle("");
    setAmount("");
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedType(null);
    setTitle("");
    setAmount("");
  };

  const handleCreateTransaction = async () => {
    if (saving || !selectedType) return;

    if (!title.trim()) {
      Alert.alert("Champ requis", "Ajoute un titre.");
      return;
    }

    const numericAmount = Number(amount.replace(",", "."));

    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Montant invalide", "Ajoute un montant valide.");
      return;
    }

    try {
      setSaving(true);

      const user = await getCurrentUser();

      if (!user) {
        Alert.alert("Erreur", "Utilisateur introuvable.");
        return;
      }

      await createTransaction({
        userId: user.$id,
        title: title.trim(),
        amount: numericAmount,
        type: selectedType,
        transactionDate: `${selectedDateKey}T12:00:00.000Z`,
      });

      closeModal();
      await loadTransactions();
    } catch (error) {
      console.log(error);
      Alert.alert("Erreur", "Impossible d'ajouter la transaction.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    Alert.alert("Supprimer", "Tu veux vraiment supprimer cette transaction ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(transactionId);
            await loadTransactions();
          } catch (error) {
            console.log(error);
            Alert.alert("Erreur", "Impossible de supprimer la transaction.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <LinearGradient colors={["#020617", "#111827"]} style={styles.loader}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loaderText}>Chargement de ton espace...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#020617", "#111827", "#292524"]}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.eyebrow}>MonneyApp</Text>
              <Text style={styles.title}>Vue premium</Text>
            </View>

            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          </View>

          <Text style={styles.monthResume}>{monthLabel}</Text>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde disponible ce mois</Text>
            <Text
              style={[
                styles.balanceAmount,
                totals.balance < 0 && styles.negativeBalance,
              ]}
            >
              {formatMoney(totals.balance)}
            </Text>

            <View style={styles.balanceFooter}>
              <Text style={styles.balanceFooterText}>{insightText}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>↗</Text>
              <Text style={styles.statLabel}>Revenus</Text>
              <Text style={styles.incomeText}>{formatMoney(totals.income)}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>↘</Text>
              <Text style={styles.statLabel}>Dépenses</Text>
              <Text style={styles.expenseText}>
                {formatMoney(totals.expense)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Taux d’épargne</Text>
            <Text
              style={[
                styles.insightValue,
                totals.savingsRate < 0 && styles.expenseText,
              ]}
            >
              {totals.income > 0 ? `${totals.savingsRate}%` : "—"}
            </Text>
            <Text style={styles.insightHint}>Objectif conseillé : 20%</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Plus grosse dépense</Text>
            <Text style={styles.insightValueSmall} numberOfLines={1}>
              {topExpense ? topExpense.title : "Aucune"}
            </Text>
            <Text style={styles.insightHint}>
              {topExpense ? formatMoney(Number(topExpense.amount)) : "Ce mois-ci"}
            </Text>
          </View>
        </View>

        <View style={styles.calendarCard} {...calendarSwipeResponder.panHandlers}>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarTitleBlock}>
              <Text style={styles.sectionTitle}>Calendrier</Text>
              <Text style={styles.calendarMonthHint}>
                Glisse ← → pour changer de mois · {visibleMonthTransactions.length} mouvement
                {visibleMonthTransactions.length > 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.monthControls}>
              <TouchableOpacity
                style={styles.monthButton}
                activeOpacity={0.82}
                onPress={() => changeMonth(-1)}
              >
                <Text style={styles.monthButtonText}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.monthButton}
                activeOpacity={0.82}
                onPress={() => changeMonth(1)}
              >
                <Text style={styles.monthButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.monthPillRow}>
            <View>
              <Text style={styles.calendarMonth}>{monthLabel}</Text>
              <Text style={styles.calendarMonthHint}>
                {visibleMonthTransactions.length} mouvement
                {visibleMonthTransactions.length > 1 ? "s" : ""} ce mois-ci
              </Text>
            </View>

            <TouchableOpacity
              style={styles.todayButton}
              activeOpacity={0.82}
              onPress={goToToday}
            >
              <Text style={styles.todayButtonText}>Aujourd’hui</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScroll}
          >
            {calendarDays.map((day) => {
              const isSelected = day.dateKey === selectedDateKey;
              const hasMovement = day.income > 0 || day.expense > 0;
              const isToday = day.dateKey === getDateKey(new Date());

              return (
                <TouchableOpacity
                  key={day.dateKey}
                  activeOpacity={0.86}
                  onPress={() => setSelectedDateKey(day.dateKey)}
                  style={[
                    styles.dayCard,
                    isSelected && styles.dayCardSelected,
                    isToday && !isSelected && styles.dayCardToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      isSelected && styles.dayLabelSelected,
                    ]}
                  >
                    Jour
                  </Text>

                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {day.day}
                  </Text>

                  {isToday && (
                    <Text
                      style={[
                        styles.todayMiniLabel,
                        isSelected && styles.todayMiniLabelSelected,
                      ]}
                    >
                      Today
                    </Text>
                  )}

                  {hasMovement ? (
                    <>
                      <View style={styles.dayDots}>
                        {day.income > 0 && <View style={styles.incomeDot} />}
                        {day.expense > 0 && <View style={styles.expenseDot} />}
                      </View>

                      <Text
                        style={[
                          styles.dayBalance,
                          day.balance >= 0
                            ? styles.incomeText
                            : styles.expenseText,
                        ]}
                      >
                        {day.balance >= 0 ? "+" : "-"}
                        {formatShortMoney(Math.abs(day.balance))}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.emptyDay,
                        isSelected && styles.emptyDaySelected,
                      ]}
                    >
                      —
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionTitle}>Analyse du mois</Text>
              <Text style={styles.sectionSubtitle}>
                Visualise tes dépenses en un coup d’œil.
              </Text>
            </View>
          </View>

          <SpendingChart transactions={visibleMonthTransactions} />
        </View>

        <View style={styles.transactionsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.selectedDateText}>
              {selectedDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>

          <Text style={styles.transactionsCount}>
            {selectedDayTransactions.length}
          </Text>
        </View>

        {selectedDayTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptyText}>
              Appuie sur le bouton + pour ajouter un revenu ou une dépense à ce
              jour.
            </Text>
          </View>
        ) : (
          selectedDayTransactions.map((item) => (
            <TouchableOpacity
              key={item.$id}
              style={styles.transactionCard}
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.transactionIcon,
                  item.type === "income"
                    ? styles.transactionIconIncome
                    : styles.transactionIconExpense,
                ]}
              >
                <Text style={styles.transactionIconText}>
                  {item.type === "income" ? "+" : "-"}
                </Text>
              </View>

              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                <Text style={styles.transactionType}>
                  {item.type === "income" ? "Revenu" : "Dépense"}
                </Text>
              </View>

              <View style={styles.transactionRight}>
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

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTransaction(item.$id)}
                >
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.88} onPress={openModal}>
        <LinearGradient colors={["#FDE68A", "#F59E0B"]} style={styles.fabGradient}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            {!selectedType ? (
              <>
                <Text style={styles.modalTitle}>Ajouter une transaction</Text>
                <Text style={styles.modalSubtitle}>
                  Pour le{" "}
                  {selectedDate.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>

                <TouchableOpacity
                  style={[styles.choiceButton, styles.incomeChoice]}
                  onPress={() => setSelectedType("income")}
                >
                  <Text style={styles.choiceIcon}>+</Text>
                  <View>
                    <Text style={styles.choiceTitle}>Revenu</Text>
                    <Text style={styles.choiceText}>Salaire, vente, bonus...</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.choiceButton, styles.expenseChoice]}
                  onPress={() => setSelectedType("expense")}
                >
                  <Text style={styles.choiceIcon}>-</Text>
                  <View>
                    <Text style={styles.choiceTitle}>Dépense</Text>
                    <Text style={styles.choiceText}>
                      Courses, loyer, transport...
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  {selectedType === "income"
                    ? "Nouveau revenu"
                    : "Nouvelle dépense"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Date sélectionnée : {selectedDate.toLocaleDateString("fr-FR")}
                </Text>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Titre"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Montant"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleCreateTransaction}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#111827" />
                  ) : (
                    <Text style={styles.saveButtonText}>Ajouter</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedType(null)}
                >
                  <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const premiumShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FB" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: {
    color: "#CBD5E1",
    marginTop: 14,
    fontWeight: "700",
  },
  content: { paddingBottom: 125 },

  hero: {
    paddingTop: 72,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    top: -60,
    right: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(245,158,11,0.28)",
  },
  heroGlowTwo: {
    position: "absolute",
    bottom: -80,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(250,204,21,0.14)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  premiumBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  premiumBadgeText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  monthResume: {
    color: "#CBD5E1",
    marginTop: 8,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  balanceCard: {
    marginTop: 26,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 30,
    padding: 20,
  },
  balanceLabel: { color: "#CBD5E1", fontSize: 14, fontWeight: "700" },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: -1.2,
  },
  negativeBalance: { color: "#FCA5A5" },
  balanceFooter: {
    marginTop: 14,
    backgroundColor: "rgba(15,23,42,0.35)",
    borderRadius: 18,
    padding: 12,
  },
  balanceFooterText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 16,
  },
  statIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  statLabel: { color: "#CBD5E1", fontSize: 12, marginBottom: 8 },
  incomeText: { color: "#22C55E", fontWeight: "900" },
  expenseText: { color: "#EF4444", fontWeight: "900" },

  insightsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  insightCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    ...premiumShadow,
  },
  insightLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  insightValue: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
  },
  insightValueSmall: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  insightHint: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "700",
  },

  calendarCard: {
    margin: 20,
    marginBottom: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    ...premiumShadow,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  calendarTitleBlock: {
    flex: 1,
  },
  cardHeader: {
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  sectionSubtitle: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  monthControls: {
    flexDirection: "row",
    gap: 8,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthButtonText: {
    color: "#0F172A",
    fontSize: 34,
    fontWeight: "900",
    marginTop: -5,
  },
  monthPillRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  calendarMonth: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  calendarMonthHint: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  todayButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  calendarScroll: { gap: 12, paddingTop: 18, paddingRight: 4 },
  dayCard: {
    width: 90,
    minHeight: 124,
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  dayCardSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  dayCardToday: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  dayLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dayLabelSelected: { color: "#CBD5E1" },
  dayNumber: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  dayNumberSelected: { color: "#FFFFFF" },
  todayMiniLabel: {
    marginTop: 2,
    color: "#D97706",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  todayMiniLabelSelected: {
    color: "#FDE68A",
  },
  dayDots: { flexDirection: "row", gap: 5, marginTop: 9 },
  incomeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  expenseDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EF4444",
  },
  emptyDay: { marginTop: 9, color: "#94A3B8", fontWeight: "900" },
  emptyDaySelected: { color: "#CBD5E1" },
  dayBalance: {
    fontSize: 10,
    marginTop: 9,
    textAlign: "center",
  },

  chartCard: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    ...premiumShadow,
  },

  transactionsHeader: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedDateText: {
    color: "#64748B",
    marginTop: 4,
    textTransform: "capitalize",
    fontWeight: "700",
  },
  transactionsCount: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    color: "#334155",
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  emptyText: { color: "#64748B", marginTop: 8, lineHeight: 20 },
  transactionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
    }),
  },
  transactionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionIconIncome: {
    backgroundColor: "#DCFCE7",
  },
  transactionIconExpense: {
    backgroundColor: "#FEE2E2",
  },
  transactionIconText: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginTop: -2,
  },
  transactionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  transactionTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  transactionType: { color: "#64748B", marginTop: 4, fontWeight: "700" },
  transactionAmount: { fontSize: 15 },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "900",
  },

  fab: {
    position: "absolute",
    right: 22,
    bottom: 32,
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#F59E0B",
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
    marginTop: -4,
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.62)",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 24,
    paddingBottom: 38,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  modalSubtitle: { color: "#64748B", marginTop: 6, marginBottom: 20 },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 24,
    marginTop: 12,
  },
  incomeChoice: { backgroundColor: "#DCFCE7" },
  expenseChoice: { backgroundColor: "#FEE2E2" },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    lineHeight: 44,
    fontSize: 27,
    fontWeight: "900",
    color: "#111827",
  },
  choiceTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  choiceText: { color: "#64748B", marginTop: 3 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 14,
    color: "#111827",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: { color: "#111827", fontSize: 16, fontWeight: "900" },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backButtonText: { color: "#64748B", fontWeight: "800" },
});