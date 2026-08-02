import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});