// components/AnimatedLogoLoader.tsx

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AnimatedLogoLoader() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fade, scale, glow, wave]);

  const waveTranslate = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 90],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  return (
    <LinearGradient
      colors={["#020617", "#04111F", "#061B35"]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoGlow,
          {
            opacity: glow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.28, 0.75],
            }),
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.mark}>
          <LinearGradient
            colors={["#5EE7FF", "#0077FF", "#003BBA"]}
            style={[styles.bar, styles.leftBar]}
          />
          <LinearGradient
            colors={["#5EE7FF", "#006DFF", "#002C92"]}
            style={[styles.bar, styles.rightBar]}
          />
          <LinearGradient
            colors={["#1E5BFF", "#031B5C"]}
            style={styles.innerBar}
          />
        </View>

        <Text style={styles.brand}>MAVRO</Text>

        <Animated.View
          style={[
            styles.lightLine,
            {
              transform: [{ translateX: waveTranslate }],
              opacity: glow,
            },
          ]}
        />
      </Animated.View>

      <View style={styles.waveContainer}>
        <Animated.View
          style={[
            styles.wave,
            {
              transform: [{ translateX: waveTranslate }],
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
  },
  logoGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#006DFF",
    shadowColor: "#0077FF",
    shadowOpacity: 0.9,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
  },
  mark: {
    width: 180,
    height: 120,
    position: "relative",
    marginBottom: 34,
  },
  bar: {
    position: "absolute",
    width: 38,
    height: 138,
    borderRadius: 18,
  },
  leftBar: {
    left: 43,
    top: -5,
    transform: [{ rotate: "31deg" }],
  },
  rightBar: {
    right: 43,
    top: -5,
    transform: [{ rotate: "-31deg" }],
  },
  innerBar: {
    position: "absolute",
    width: 34,
    height: 82,
    borderRadius: 16,
    right: 58,
    top: 38,
    transform: [{ rotate: "31deg" }],
    opacity: 0.95,
  },
  brand: {
    color: "#F8FAFC",
    fontSize: 42,
    fontWeight: "300",
    letterSpacing: 18,
    textShadowColor: "rgba(255,255,255,0.25)",
    textShadowRadius: 18,
  },
  lightLine: {
    width: 110,
    height: 2,
    marginTop: 22,
    borderRadius: 99,
    backgroundColor: "#4FC3FF",
    shadowColor: "#4FC3FF",
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  waveContainer: {
    position: "absolute",
    bottom: 80,
    width: "120%",
    height: 160,
    overflow: "hidden",
    opacity: 0.65,
  },
  wave: {
    width: "75%",
    height: 120,
    borderTopWidth: 2,
    borderColor: "#087BFF",
    borderRadius: 120,
    alignSelf: "center",
    shadowColor: "#009DFF",
    shadowOpacity: 1,
    shadowRadius: 24,
  },
});