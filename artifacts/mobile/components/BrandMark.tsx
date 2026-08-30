import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const LOGO = require('../assets/images/nuvo-logo.png');

export function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: Math.round(size * 0.22) }]}>
      <Image source={LOGO} resizeMode="cover" style={styles.mark} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#FFFFFF' },
  mark: { width: '100%', height: '100%' },
});