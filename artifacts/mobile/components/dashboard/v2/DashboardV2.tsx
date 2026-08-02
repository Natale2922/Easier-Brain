import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import SummaryCards from './SummaryCards';
import NextTaskCard from './NextTaskCard';
import QuickActions from './QuickActions';
import TodayTimeline from './TodayTimeline';

export default function DashboardV2() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Bienvenido a Nuvo
        </Text>
      </View>

      <SummaryCards />

      <NextTaskCard />

      <TodayTimeline />

      <QuickActions />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  header: {
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 15,
  },
});