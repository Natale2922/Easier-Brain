import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function BrandMark({ size = 52 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            color: colors.primaryForeground,
            fontSize: size * 0.58,
            lineHeight: size * 0.65,
            fontFamily: 'Inter_700Bold',
          },
        ]}
      >
        N
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  letter: { includeFontPadding: false, letterSpacing: -1 },
});