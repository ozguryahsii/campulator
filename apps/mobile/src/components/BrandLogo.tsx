import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface Props {
  size?: number;
}

/**
 * Campulator logosu. Görsel `assets/brand/logo.png` dosyasından gelir;
 * tasarımdan yeni dosya geldiğinde aynı adla üzerine yazmak yeterlidir
 * (bkz. assets/brand/README.md).
 */
export function BrandLogo({ size = 96 }: Props) {
  return (
    <Image
      source={require('../../assets/brand/logo.png')}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Campulator"
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});
