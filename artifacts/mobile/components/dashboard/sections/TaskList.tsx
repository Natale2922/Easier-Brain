import React from 'react';
import { FlatList } from 'react-native';

import { Task } from '@/context/TasksContext';
import { TaskItem } from '@/components/tasks/TaskItem';

type Props = {
  tasks: Task[];
  onSelect(task: Task): void;
  onRefresh?(): void;
  refreshing?: boolean;
};

export default function TaskList({
  tasks,
  onSelect,
  onRefresh,
  refreshing = false,
}: Props) {
  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem task={item} onPress={() => onSelect(item)} />
      )}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
