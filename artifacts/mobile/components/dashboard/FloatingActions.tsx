import React from "react";
import { View, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

type Props = {
  styles: any;
  colors: any;
  setAiDialogVisible: (visible: boolean) => void;
};

export default function FloatingActions({
  styles,
  colors,
  setAiDialogVisible,
}: Props) {
return (
    <View>
      <View style={[styles.fabGroup, { bottom: Platform.OS === 'web' ? 106 : 90 }]}>
        <Pressable
          style={({ pressed }) => [styles.fabSecondary, { backgroundColor: colors.secondary, borderRadius: 20, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAiDialogVisible(true); }}
        >
          <Feather name="zap" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, borderRadius: 28, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push('/add')}
        >
          <Feather name="plus" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
      
    </View>
  );
}