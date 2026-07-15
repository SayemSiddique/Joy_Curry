// Labeled text input with an inline error/hint line — shared by the sign-in and
// checkout forms so validation styling stays consistent. Mirrors the web
// .form-group / .form-input / .form-error trio.
import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { font } from './font';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, required, style, ...props },
  ref,
) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TextInput
        ref={ref}
        style={[styles.input, !!error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: spacePx[1],
  },
  label: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  req: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    minHeight: 48,
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[3],
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },
});
