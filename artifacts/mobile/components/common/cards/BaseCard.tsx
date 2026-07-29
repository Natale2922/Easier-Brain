import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

type Props = ViewProps & {
  children: React.ReactNode;
};

export default function BaseCard({ children, style, ...props }: Props) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
});
