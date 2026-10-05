import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { displayFontFamily } from '@/theme/typography';

const LOGO = require('../assets/images/nuvo-logo.png');

export function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: Math.round(size * 0.22) }]}>
      <Image source={LOGO} resizeMode="cover" style={styles.mark} />
    </View>
  );
}

export function BrandLockup({ size = 34 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={styles.lockup}>
      <BrandMark size={size} />
      <Text style={[styles.wordmark, { color: colors.foreground }]}>
        nuvo<Text style={{ color: colors.primary }}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#FFFFFF' },
  mark: { width: '100%', height: '100%' },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontFamily: displayFontFamily, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
});