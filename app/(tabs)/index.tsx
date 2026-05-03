// app/(tabs)/index.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useSettings } from "@/context/settings-context";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const COLORS = {
  navy: "#020617",
  navy2: "#06152B",
  blue: "#0077FF",
  cyan: "#5EE7FF",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  bg: "#F4F8FF",
  green: "#22C55E",
  red: "#EF4444",
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

function createDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export default function HomeScreen() {
  const { currency } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState(getDateKey(new Date()));

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const formatMoney = useCallback(
    (value: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value),
    [currency]
  );

  const formatShortMoney = useCallback(
    (value: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
    [currency]
  );

  const selectedDate = useMemo(
    () => createDateFromKey(selectedDateKey),
    [selectedDateKey]
  );

  const monthLabel = useMemo(() => getMonthLabel(visibleMonth), [visibleMonth]);

  const changeMonth = useCallback((direction: number) => {
    setVisibleMonth((current) => {
      const nextMonth = new Date(
        current.getFullYear(),
        current.getMonth() + direction,
        1
      );

      setSelectedDateKey(getDateKey(nextMonth));
      return nextMonth;
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(getDateKey(today));
  }, []);

  const calendarSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 28 && Math.abs(gestureState.dy) < 18,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -55) changeMonth(1);
        if (gestureState.dx > 55) changeMonth(-1);
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
    const spentRate =
      income > 0 ? Math.min(Math.round((expense / income) * 100), 999) : 0;

    return { income, expense, balance, savingsRate, spentRate };
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
      return "Ajoute tes premiers mouvements pour activer ton espace MAVRO.";
    }

    if (totals.balance > 0) {
      return `Ton mois est positif avec ${formatShortMoney(
        totals.balance
      )} disponibles.`;
    }

    if (totals.balance < 0) {
      return `Tes dépenses dépassent tes revenus de ${formatShortMoney(
        Math.abs(totals.balance)
      )}.`;
    }

    return "Ton mois est parfaitement équilibré.";
  }, [visibleMonthTransactions.length, totals.balance, formatShortMoney]);

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
      <LinearGradient colors={[COLORS.navy, COLORS.navy2]} style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loaderText}>Chargement de ton espace MAVRO...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.blue}
          />
        }
      >
        <LinearGradient
          colors={["#020617", "#06152B", "#08214A"]}
          style={styles.hero}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <View style={styles.heroGlowThree} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.eyebrow}>MAVRO</Text>
              <Text style={styles.title}>Dashboard privé</Text>
            </View>

            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>M</Text>
            </View>
          </View>

          <Text style={styles.monthResume}>{monthLabel}</Text>

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceChip}>
                {totals.balance >= 0 ? "Stable" : "À surveiller"}
              </Text>
            </View>

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
            <Text style={styles.insightLabel}>Épargne</Text>
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
            <Text style={styles.insightLabel}>Dépensé</Text>
            <Text style={styles.insightValue}>
              {totals.income > 0 ? `${totals.spentRate}%` : "—"}
            </Text>
            <Text style={styles.insightHint}>Du revenu mensuel</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Top dépense</Text>
            <Text style={styles.insightValueSmall} numberOfLines={1}>
              {topExpense ? topExpense.title : "Aucune"}
            </Text>
            <Text style={styles.insightHint}>
              {topExpense
                ? formatMoney(Number(topExpense.amount))
                : "Ce mois-ci"}
            </Text>
          </View>
        </View>

        <View style={styles.calendarCard} {...calendarSwipeResponder.panHandlers}>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarTitleBlock}>
              <Text style={styles.sectionTitle}>Calendrier</Text>
              <Text style={styles.sectionSubtitle}>
                Glisse pour naviguer entre les mois.
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

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekText}>
                {day}
              </Text>
            ))}
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
            <Text style={styles.sectionTitle}>Analyse du mois</Text>
            <Text style={styles.sectionSubtitle}>
              Visualise tes revenus et tes dépenses en un coup d’œil.
            </Text>
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
              Appuie sur le bouton + pour ajouter un revenu ou une dépense.
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
        <LinearGradient colors={[COLORS.cyan, COLORS.blue]} style={styles.fabGradient}>
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
                    <ActivityIndicator color="#FFFFFF" />
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
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  android: { elevation: 5 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: {
    color: "#CBD5E1",
    marginTop: 14,
    fontWeight: "800",
  },
  content: { paddingBottom: 128 },

  hero: {
    paddingTop: 72,
    paddingHorizontal: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    top: -70,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0,119,255,0.35)",
  },
  heroGlowTwo: {
    position: "absolute",
    bottom: -95,
    left: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(94,231,255,0.14)",
  },
  heroGlowThree: {
    position: "absolute",
    top: 180,
    right: 24,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: -1.2,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(94,231,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: COLORS.cyan,
    fontSize: 24,
    fontWeight: "900",
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
    borderColor: "rgba(94,231,255,0.20)",
    borderRadius: 32,
    padding: 20,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { color: "#CBD5E1", fontSize: 14, fontWeight: "800" },
  balanceChip: {
    color: COLORS.cyan,
    backgroundColor: "rgba(0,119,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(94,231,255,0.26)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 10,
    letterSpacing: -1.5,
  },
  negativeBalance: { color: "#FCA5A5" },
  balanceFooter: {
    marginTop: 14,
    backgroundColor: "rgba(2,6,23,0.42)",
    borderRadius: 18,
    padding: 12,
  },
  balanceFooterText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 26,
    padding: 16,
  },
  statIcon: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  statLabel: { color: "#CBD5E1", fontSize: 12, marginBottom: 8 },
  incomeText: { color: COLORS.green, fontWeight: "900" },
  expenseText: { color: COLORS.red, fontWeight: "900" },

  insightsGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8F1FF",
    ...premiumShadow,
  },
  insightLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  insightValue: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 8,
  },
  insightValueSmall: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  insightHint: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "800",
  },

  calendarCard: {
    margin: 20,
    marginBottom: 0,
    backgroundColor: COLORS.card,
    borderRadius: 34,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8F1FF",
    ...premiumShadow,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  calendarTitleBlock: { flex: 1 },
  cardHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text },
  sectionSubtitle: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  monthControls: { flexDirection: "row", gap: 8 },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCEBFF",
  },
  monthButtonText: {
    color: COLORS.blue,
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
    color: COLORS.text,
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
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  weekText: {
    width: 28,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
  },
  calendarScroll: { gap: 12, paddingTop: 16, paddingRight: 4 },
  dayCard: {
    width: 90,
    minHeight: 124,
    borderRadius: 28,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DCEBFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  dayCardSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.blue,
  },
  dayCardToday: {
    borderColor: COLORS.blue,
    backgroundColor: "#EEF7FF",
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
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  dayNumberSelected: { color: "#FFFFFF" },
  todayMiniLabel: {
    marginTop: 2,
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  todayMiniLabelSelected: { color: COLORS.cyan },
  dayDots: { flexDirection: "row", gap: 5, marginTop: 9 },
  incomeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },
  expenseDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: COLORS.red,
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
    backgroundColor: COLORS.card,
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8F1FF",
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
    color: COLORS.muted,
    marginTop: 4,
    textTransform: "capitalize",
    fontWeight: "700",
  },
  transactionsCount: {
    backgroundColor: "#DCEBFF",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    color: COLORS.blue,
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 24,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E8F1FF",
  },
  emptyEmoji: { fontSize: 28, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  emptyText: { color: COLORS.muted, marginTop: 8, lineHeight: 20 },
  transactionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8F1FF",
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
  transactionIconIncome: { backgroundColor: "#DCFCE7" },
  transactionIconExpense: { backgroundColor: "#FEE2E2" },
  transactionIconText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: -2,
  },
  transactionInfo: { flex: 1, paddingRight: 12 },
  transactionRight: { alignItems: "flex-end", gap: 8 },
  transactionTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  transactionType: { color: COLORS.muted, marginTop: 4, fontWeight: "700" },
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
        shadowColor: COLORS.blue,
        shadowOpacity: 0.55,
        shadowRadius: 20,
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
    color: "#FFFFFF",
    marginTop: -4,
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.68)",
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
  modalTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text },
  modalSubtitle: { color: COLORS.muted, marginTop: 6, marginBottom: 20 },
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
    color: COLORS.text,
  },
  choiceTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  choiceText: { color: COLORS.muted, marginTop: 3 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backButtonText: { color: COLORS.muted, fontWeight: "800" },
});