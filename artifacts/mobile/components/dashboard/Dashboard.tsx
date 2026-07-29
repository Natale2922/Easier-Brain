import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import DashboardHeader from './layout/DashboardHeader';
import StatsCard from './cards/StatsCard';
import WeeklySummary from './widgets/WeeklySummary';
import UpcomingTasks from './sections/UpcomingTasks';

export default function Dashboard() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DashboardHeader />

      <StatsCard title="Hoy" value={0} />
      <StatsCard title="Esta semana" value={0} />
      <StatsCard title="Pendientes" value={0} />

      <WeeklySummary />

      <UpcomingTasks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
});
