import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { getCurrentUser } from "@/services/auth";
import { createTransaction } from "@/services/transactions";

export default function AddTransactionScreen() {
  const { type } = useLocalSearchParams<{ type: "income" | "expense" }>();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  async function handleSubmit() {
    try {
      const user = await getCurrentUser();

      if (!user) {
        Alert.alert("Erreur", "Utilisateur non connecté");
        return;
      }

      await createTransaction({
        userId: user.$id,
        title,
        type: type || "expense",
        amount: Number(amount),
      });

      Alert.alert("Succès", "Transaction ajoutée");

      router.back();
    } catch (error) {
      console.log(error);
      Alert.alert("Erreur", "Impossible d'ajouter la transaction");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          {type === "income" ? "Ajouter un revenu" : "Ajouter une dépense"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Titre (ex: Salaire)"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Montant"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Valider</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08111f",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#111827",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
  },
  input: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#1f2937",
    color: "#fff",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});