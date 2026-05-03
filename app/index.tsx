// app/index.tsx

import { useEffect, useState } from "react";
import { Redirect } from "expo-router";

import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { getCurrentUser } from "@/services/auth";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkUser() {
      const startedAt = Date.now();

      const currentUser = await getCurrentUser();

      const elapsed = Date.now() - startedAt;
      const remainingTime = Math.max(0, 5200 - elapsed);

      setTimeout(() => {
        setUser(currentUser);
        setLoading(false);
      }, remainingTime);
    }

    checkUser();
  }, []);

  if (loading) {
    return <AnimatedLogoLoader />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}