import React from "react";
import { FlatList } from "react-native";

type Props = {
  pendingTasks: any[];
  isLoading: boolean;
  isSyncing: boolean;
  doSync: () => void;
  setSelectedTask: (task: any) => void;
  TaskItem: any;
  styles: any;
  colors: any;
  filter: string;
};

export default function TaskList({
  pendingTasks,
  isLoading,
  isSyncing,
  doSync,
  setSelectedTask,
  TaskItem,
  styles,
  colors,
  filter,
}: Props) {
  return (
    <FlatList
      data={pendingTasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onPress={() => setSelectedTask(item)}
        />
      )}
      contentContainerStyle={[
        styles.listContent,
        pendingTasks.length === 0 && styles.emptyContent,
      ]}
      showsVerticalScrollIndicator={false}
      refreshing={isSyncing}
      onRefresh={doSync}
      ListEmptyComponent={!isLoading ? null : null}
    />
  );
}