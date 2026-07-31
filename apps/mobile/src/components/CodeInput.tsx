import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../theme/tokens';

interface Props {
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  autoFocus?: boolean;
}

/** E-posta ile gelen 6 haneli kod girişi; yalnızca rakam kabul eder. */
export function CodeInput({ value, onChange, accessibilityLabel, autoFocus }: Props) {
  const theme = useTheme();
  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.elevatedSurface,
          borderColor: value.length === 6 ? theme.colors.primary : theme.colors.border,
          color: theme.colors.textPrimary,
        },
      ]}
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      maxLength={6}
      autoFocus={autoFocus}
      // iOS e-postadaki kodu klavye üstünde önerir
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      placeholder="••••••"
      placeholderTextColor={theme.colors.border}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
  },
});
