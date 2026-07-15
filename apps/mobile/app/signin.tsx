// Passwordless OTP sign-in — parity with web's AuthFlow (email → 6-digit code →
// name/phone for new accounts). Uses the shared otpApi; on success setAuth()
// persists the JWT to SecureStore (jc_auth) via the native storage adapter.
//
// A ?next=/route param lets the checkout funnel resume after auth: cart's
// Checkout button routes here with next=/checkout, and done() replaces this
// modal with that route.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  authState,
  loadRewards,
  otpApi,
  setAuth,
  type UserProfile,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { Field } from '../src/ui/Field';
import { font } from '../src/ui/font';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'code' | 'details';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devHint, setDevHint] = useState('');

  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  // Already signed in? Leave immediately.
  useEffect(() => {
    if (authState.get().token) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
    if (step === 'details') nameRef.current?.focus();
  }, [step]);

  function done() {
    const next = params.next;
    if (next && /^\/(?!\/)/.test(next)) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function finish(token: string, user: UserProfile) {
    setAuth(token, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as 'customer' | 'admin') ?? 'customer',
    });
    loadRewards(); // preload the Vault summary (used in S11)
    done();
  }

  const handleEmail = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      setEmail(value);
      const res = await otpApi.request(value);
      if (res.devCode) setDevHint(`Dev code: ${res.devCode}`);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await otpApi.verify(email, code.trim());
      if (res.exists) {
        finish(res.token, res.user);
      } else {
        setTicket(res.ticket);
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDetails = async () => {
    if (name.trim().length < 2) {
      setError('Please enter your name (2+ characters).');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await otpApi.register({ ticket, name: name.trim(), phone: phone.trim() || undefined });
      finish(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setCode('');
    try {
      const res = await otpApi.request(email);
      if (res.devCode) setDevHint(`Dev code: ${res.devCode}`);
    } catch {
      setError('Could not resend the code. Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Sign In', presentation: 'modal', headerShown: true }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'email' && (
            <>
              <Text style={styles.heading}>Sign in or create an account</Text>
              <Text style={styles.sub}>
                We'll email you a 6-digit code — no password needed.
              </Text>
              <Field
                label="Email"
                required
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleEmail}
                editable={!busy}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <PrimaryButton label="Send code" onPress={handleEmail} busy={busy} />
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={styles.heading}>Enter your code</Text>
              <Text style={styles.sub}>
                We sent a 6-digit code to <Text style={styles.bold}>{email}</Text>.
              </Text>
              <Field
                ref={codeRef}
                label="6-digit code"
                required
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                returnKeyType="go"
                onSubmitEditing={handleCode}
                editable={!busy}
                style={styles.codeInput}
              />
              {!!devHint && <Text style={styles.devHint}>{devHint}</Text>}
              {!!error && <Text style={styles.error}>{error}</Text>}
              <PrimaryButton label="Verify" onPress={handleCode} busy={busy} />
              <View style={styles.linkRow}>
                <Pressable onPress={() => { setStep('email'); setCode(''); setError(''); }} hitSlop={8}>
                  <Text style={styles.link}>Change email</Text>
                </Pressable>
                <Pressable onPress={resendCode} hitSlop={8}>
                  <Text style={styles.link}>Resend code</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'details' && (
            <>
              <Text style={styles.heading}>Welcome! Let's finish up</Text>
              <Text style={styles.sub}>Tell us your name so we can personalize your orders.</Text>
              <Field
                ref={nameRef}
                label="Name"
                required
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError('');
                }}
                placeholder="Your full name"
                autoComplete="name"
                returnKeyType="next"
                editable={!busy}
              />
              <Field
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="(212) 555-0100"
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="go"
                onSubmitEditing={handleDetails}
                editable={!busy}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <PrimaryButton label="Create account" onPress={handleDetails} busy={busy} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      style={[styles.btn, busy && styles.btnDisabled]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text style={styles.btnLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  body: {
    gap: spacePx[3],
    padding: spacePx[5],
  },
  heading: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx.xl,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    lineHeight: 22,
    marginBottom: spacePx[2],
  },
  bold: {
    fontFamily: font.bold,
  },
  codeInput: {
    fontFamily: font.bold,
    fontSize: fontSizePx.xl,
    letterSpacing: 8,
  },
  error: {
    color: colors.error,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  devHint: {
    color: colors.secondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[2],
    minHeight: 52,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacePx[2],
  },
  link: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
    paddingVertical: spacePx[1],
  },
});
