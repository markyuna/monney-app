// app/reglages.tsx

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SettingItem = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  danger?: boolean;
  onPress?: () => void;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function ReglagesScreen() {
  const sections: SettingSection[] = [
    {
      title: "Réglages généraux",
      items: [
        {
          title: "Catégories de dépense",
          subtitle: "Ajouter ou modifier vos catégories de dépense",
          icon: "💸",
          color: "#FF5A5F",
        },
        {
          title: "Catégories de revenu",
          subtitle: "Ajouter ou modifier vos catégories de revenu",
          icon: "💰",
          color: "#22C55E",
        },
        {
          title: "Devise",
          subtitle: "Choisissez la devise de votre budget",
          icon: "€",
          color: "#3B82F6",
        },
        {
          title: "Format de devise",
          subtitle: "Choisissez le format des montants",
          icon: "₣",
          color: "#F59E0B",
        },
        {
          title: "Premier jour de la semaine",
          subtitle: "Définissez le début de votre semaine",
          icon: "📅",
          color: "#8B5CF6",
        },
        {
          title: "Langue",
          subtitle: "Choisissez la langue de l’application",
          icon: "🌍",
          color: "#06B6D4",
        },
      ],
    },
    {
      title: "Sécurité",
      items: [
        {
          title: "Mot de passe",
          subtitle: "Configurer ou modifier votre mot de passe",
          icon: "🔐",
          color: "#334155",
        },
        {
          title: "Confidentialité",
          subtitle: "Consulter la politique de confidentialité",
          icon: "🛡️",
          color: "#14B8A6",
        },
        {
          title: "Réinitialiser toutes les données",
          subtitle: "Supprimer toutes vos données de l’application",
          icon: "🗑️",
          color: "#EF4444",
          danger: true,
          onPress: () =>
            Alert.alert(
              "Réinitialiser les données",
              "Cette action supprimera toutes vos données. Voulez-vous continuer ?",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Réinitialiser", style: "destructive" },
              ]
            ),
        },
      ],
    },
    {
      title: "Application",
      items: [
        {
          title: "Noter l’app",
          subtitle: "Donner votre avis sur MonneyApp",
          icon: "⭐",
          color: "#FACC15",
        },
        {
          title: "Version",
          subtitle: "MonneyApp 1.0.0",
          icon: "📱",
          color: "#64748B",
        },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#111827"]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Réglages</Text>

          <View style={styles.backButtonPlaceholder} />
        </View>

        <Text style={styles.headerSubtitle}>
          Personnalisez votre expérience et gérez vos préférences.
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            <View style={styles.card}>
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;

                return (
                  <TouchableOpacity
                    key={item.title}
                    activeOpacity={0.75}
                    style={[
                      styles.item,
                      !isLast && styles.itemBorder,
                      item.danger && styles.dangerItem,
                    ]}
                    onPress={
                      item.onPress ||
                      (() => Alert.alert(item.title, "Cette option arrive bientôt."))
                    }
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <Text style={styles.iconText}>{item.icon}</Text>
                    </View>

                    <View style={styles.itemTextWrapper}>
                      <Text
                        style={[
                          styles.itemTitle,
                          item.danger && styles.dangerText,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>

                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.footerText}>MonneyApp — Gérez votre argent simplement</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 18,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 34,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 10,
    marginLeft: 4,
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  item: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  dangerItem: {
    backgroundColor: "#FFF7F7",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  itemTextWrapper: {
    flex: 1,
  },
  itemTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  dangerText: {
    color: "#DC2626",
  },
  itemSubtitle: {
    color: "#8A94A6",
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 12,
    color: "#CBD5E1",
    fontSize: 32,
    fontWeight: "300",
  },
  footerText: {
    marginTop: 4,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
});