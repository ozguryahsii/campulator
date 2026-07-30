import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { PlaceholderScreen } from '../components/PlaceholderScreen';

export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen titleKey="profile.title" placeholderKey="profile.placeholder" />
      <View style={styles.logo} pointerEvents="none">
        <BrandLogo size={72} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logo: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    opacity: 0.9,
  },
});
