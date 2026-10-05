import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          shadowColor: '#352753',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          ...(isWeb ? { height: 84 } : { height: 80 }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'extraLight'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="list.bullet.clipboard" tintColor={color} size={20} /> : <Feather name="check-square" size={20} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calificaciones"
        options={{
          title: 'Calificaciones',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="graduationcap.fill" tintColor={color} size={20} /> : <Feather name="award" size={20} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="done"
        options={{
          title: 'Archivo',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="checkmark.circle.fill" tintColor={color} size={20} /> : <Feather name="check-circle" size={20} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="calendar" tintColor={color} size={20} /> : <Feather name="calendar" size={20} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="materias"
        options={{
          title: 'Materias',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="book.closed.fill" tintColor={color} size={20} /> : <Feather name="book-open" size={20} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="horario"
        options={{
          title: 'Horario',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.secondary : 'transparent' }]}>
              {isIOS ? <SymbolView name="clock.fill" tintColor={color} size={20} /> : <Feather name="clock" size={20} color={color} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
