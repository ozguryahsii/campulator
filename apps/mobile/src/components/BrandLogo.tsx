import React from 'react';
import { Image, StyleSheet } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro varlık çözümlemesi require ister
const LOGO = require('../../assets/brand/logo.png');

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
      source={LOGO}
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
