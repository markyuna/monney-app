// app/(tabs)/index.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
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

    return {
      income,
      expense,
      balance: income - expense,
    };
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
      <LinearGradient colors={["#0F172A", "#111827"]} style={styles.loader}>
        <ActivityIndicator size="large" color="#FACC15" />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient colors={["#111827", "#1F2937"]} style={styles.hero}>
          <Text style={styles.eyebrow}>MonneyApp</Text>
          <Text style={styles.title}>Résumé du mois</Text>

          <Text style={styles.monthResume}>
            {visibleMonth.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </Text>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde du mois</Text>
            <Text
              style={[
                styles.balanceAmount,
                totals.balance < 0 && styles.negativeBalance,
              ]}
            >
              {formatMoney(totals.balance)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Revenus</Text>
              <Text style={styles.incomeText}>{formatMoney(totals.income)}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Dépenses</Text>
              <Text style={styles.expenseText}>
                {formatMoney(totals.expense)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Calendrier</Text>

            <View style={styles.monthControls}>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => changeMonth(-1)}
              >
                <Text style={styles.monthButtonText}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.calendarMonth}>
                {visibleMonth.toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => changeMonth(1)}
              >
                <Text style={styles.monthButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScroll}
          >
            {calendarDays.map((day) => {
              const isSelected = day.dateKey === selectedDateKey;
              const hasMovement = day.income > 0 || day.expense > 0;

              return (
                <TouchableOpacity
                  key={day.dateKey}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDateKey(day.dateKey)}
                  style={[
                    styles.dayCard,
                    isSelected && styles.dayCardSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {day.day}
                  </Text>

                  {hasMovement ? (
                    <View style={styles.dayDots}>
                      {day.income > 0 && <View style={styles.incomeDot} />}
                      {day.expense > 0 && <View style={styles.expenseDot} />}
                    </View>
                  ) : (
                    <Text style={styles.emptyDay}>—</Text>
                  )}

                  {hasMovement && (
                    <Text
                      style={[
                        styles.dayBalance,
                        day.balance >= 0 ? styles.incomeText : styles.expenseText,
                      ]}
                    >
                      {day.balance >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(day.balance))}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Analyse du mois</Text>
          <SpendingChart transactions={visibleMonthTransactions} />
        </View>

        <View style={styles.transactionsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.selectedDateText}>
              {new Date(`${selectedDateKey}T12:00:00.000Z`).toLocaleDateString(
                "fr-FR",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </Text>
          </View>

          <Text style={styles.transactionsCount}>
            {selectedDayTransactions.length}
          </Text>
        </View>

        {selectedDayTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
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
              activeOpacity={0.8}
            >
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
                    item.type === "income" ? styles.incomeText : styles.expenseText,
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

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalCard}>
            {!selectedType ? (
              <>
                <Text style={styles.modalTitle}>Ajouter une transaction</Text>
                <Text style={styles.modalSubtitle}>
                  Pour le{" "}
                  {new Date(`${selectedDateKey}T12:00:00.000Z`).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
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
                  {selectedType === "income" ? "Nouveau revenu" : "Nouvelle dépense"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Date sélectionnée :{" "}
                  {new Date(`${selectedDateKey}T12:00:00.000Z`).toLocaleDateString(
                    "fr-FR"
                  )}
                </Text>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Titre"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />

                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Montant"
                  placeholderTextColor="#9CA3AF"
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 120 },
  hero: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  eyebrow: {
    color: "#FACC15",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", marginTop: 8 },
  monthResume: {
    color: "#CBD5E1",
    marginTop: 6,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  balanceCard: { marginTop: 24 },
  balanceLabel: { color: "#CBD5E1", fontSize: 15 },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 6,
  },
  negativeBalance: { color: "#FCA5A5" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
  },
  statLabel: { color: "#CBD5E1", fontSize: 13, marginBottom: 8 },
  incomeText: { color: "#22C55E", fontWeight: "800" },
  expenseText: { color: "#EF4444", fontWeight: "800" },
  calendarCard: {
    margin: 20,
    marginBottom: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  calendarHeader: { gap: 14 },
  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900",
    marginTop: -3,
  },
  calendarMonth: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  calendarScroll: { gap: 10, paddingTop: 16 },
  dayCard: {
    width: 78,
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  dayCardSelected: { backgroundColor: "#111827" },
  dayNumber: { color: "#111827", fontSize: 18, fontWeight: "900" },
  dayNumberSelected: { color: "#FFFFFF" },
  dayDots: { flexDirection: "row", gap: 5, marginTop: 8 },
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
  emptyDay: { marginTop: 6, color: "#9CA3AF" },
  dayBalance: {
    fontSize: 10,
    marginTop: 8,
    textAlign: "center",
  },
  chartCard: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  transactionsHeader: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedDateText: {
    color: "#6B7280",
    marginTop: 4,
    textTransform: "capitalize",
  },
  transactionsCount: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    color: "#374151",
    fontWeight: "700",
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { color: "#6B7280", marginTop: 8, lineHeight: 20 },
  transactionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  transactionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  transactionType: { color: "#6B7280", marginTop: 4 },
  transactionAmount: { fontSize: 16 },
  deleteButton: {
    backgroundColor: "#FEE2E2",
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#111827",
    marginTop: -3,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  modalCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 38,
  },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  modalSubtitle: { color: "#6B7280", marginTop: 6, marginBottom: 20 },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 22,
    marginTop: 12,
  },
  incomeChoice: { backgroundColor: "#DCFCE7" },
  expenseChoice: { backgroundColor: "#FEE2E2" },
  choiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    lineHeight: 42,
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  choiceTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  choiceText: { color: "#6B7280", marginTop: 3 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 14,
    color: "#111827",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#FACC15",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: { color: "#111827", fontSize: 16, fontWeight: "900" },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backButtonText: { color: "#6B7280", fontWeight: "700" },
});