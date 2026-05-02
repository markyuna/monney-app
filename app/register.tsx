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
import { Link, router } from "expo-router";

import { registerUser } from "@/services/auth";

export default function RegisterScreen() {
  const [name, setName] = useState("Marcos");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    try {
      await registerUser({ name, email, password });
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de créer le compte.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>MONNEYAPP</Text>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Commence à suivre tes finances.</Text>

        <TextInput
          style={styles.input}
          placeholder="Nom"
          placeholderTextColor="#94a3b8"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Créer mon compte</Text>
        </Pressable>

        <Link href="/login" style={styles.link}>
          J’ai déjà un compte
        </Link>
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
    borderRadius: 32,
    backgroundColor: "#111827",
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  logo: {
    color: "#38bdf8",
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#1f2937",
    color: "#fff",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  button: {
    height: 58,
    borderRadius: 20,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  link: {
    color: "#38bdf8",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "800",
  },
});