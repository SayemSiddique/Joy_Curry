import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_900Black,
  useFonts,
} from '@expo-google-fonts/rubik';
import { colors } from '@joy-curry/tokens';
import { authState } from '@joy-curry/core';
import { initMobileCore } from '../src/lib/core';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_URL_SCHEME } from '../src/lib/stripe';
import { ensurePushRegistered, usePushTapHandler } from '../src/lib/notifications';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';
import { ToastHost } from '../src/ui/Toast';

export default function RootLayout() {
  const [coreReady, setCoreReady] = useState(false);
  const [fontsReady] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_900Black,
  });

  const auth = useNano(authState);

  useEffect(() => {
    // Storage hydration is a few ms; the native splash screen covers the gap.
    initMobileCore().then(() => setCoreReady(true));
  }, []);

  // A push tap (running or cold-start) deep-links into the order tracker.
  usePushTapHandler();

  // Re-register the device on every launch once we have both a hydrated session
  // and a signed-in token — never prompts here (only registers if already
  // granted). Runs after coreReady so authState reflects persisted storage.
  useEffect(() => {
    if (coreReady && auth.token) ensurePushRegistered();
  }, [coreReady, auth.token]);

  if (!coreReady || !fontsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* Stripe native SDK — publishableKey is public; urlScheme powers the
          return-to-app after a 3-D Secure / bank redirect. */}
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={STRIPE_URL_SCHEME}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.primary, fontFamily: font.bold },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Menu' }} />
          {/* iOS-native bottom-sheet presentation, swipe down to dismiss (HIG). */}
          <Stack.Screen name="dish/[id]" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="bundle/[id]" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="cart" options={{ title: 'Your Order' }} />
          <Stack.Screen name="signin" options={{ presentation: 'modal', title: 'Sign In' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="orders" options={{ title: 'Order History' }} />
          <Stack.Screen name="track" options={{ title: 'Track Order' }} />
          <Stack.Screen name="rewards" options={{ title: 'Artisan Vault' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
          {/* Deep-link entry routes (redirects / web pass-through). */}
          <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="menu" options={{ headerShown: false }} />
          <Stack.Screen name="group/[id]" options={{ title: 'Group Order' }} />
        </Stack>
      </StripeProvider>
      <ToastHost />
    </SafeAreaProvider>
  );
}
