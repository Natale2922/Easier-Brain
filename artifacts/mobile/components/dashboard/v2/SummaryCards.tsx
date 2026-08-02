import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function Card({
  emoji,
  title,
  value,
}: {
  emoji: string;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SummaryCards() {
  return (
    <View style={styles.container}>
      <Card emoji="🔥" title="Hoy" value="0" />
      <Card emoji="📅" title="Mañana" value="0" />
      <Card emoji="📚" title="Semana" value="0" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  value: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
  },
});