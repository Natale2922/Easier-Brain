import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = {
  pending: number;
  completedToday: number;
  university: number;
};

export default function DashboardStats({
  pending,
  completedToday,
  university,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <View style={[styles.card, { backgroundColor: colors.primary + '14' }]}>
        <Text style={[styles.number, { color: colors.primary }]}>{pending}</Text>
        <Text style={[styles.label, { color: colors.primary }]}>Pendientes</Text>
      </View>

      <View style={[styles.card, { backgroundColor: '#22C55E14' }]}>
        <Text style={[styles.number, { color: '#22C55E' }]}>{completedToday}</Text>
        <Text style={[styles.label, { color: '#22C55E' }]}>Hoy completas</Text>
      </View>

      <View style={[styles.card, { backgroundColor: '#FFB34714' }]}>
        <Text style={[styles.number, { color: '#FFB347' }]}>{university}</Text>
        <Text style={[styles.label, { color: '#FFB347' }]}>Del campus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  number: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Inter_700Bold',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
  },
});
