import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

type Filter = "all" | "today" | "tomorrow" | "week" | "nodate";

type FilterOption = {
  key: Filter; 
  label: string;
};

type Props = {
  filters: FilterOption[];
  selected: Filter;
  getCount: (filter: Filter) => number;
  onSelect: (filter: Filter) => void;
};

export default function FilterBar({
  filters,
  selected,
  getCount,
  onSelect,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((item) => (
      <TouchableOpacity
          key={item.key}
          style={[
            styles.filterChip,
            selected === item.key && styles.filterChipActive,
          ]}
          onPress={() => onSelect(item.key)}
          >
          <Text
            style={[
              styles.filterText,
              selected === item.key && styles.filterTextActive,
            ]}
          >
          {item.label} ({getCount(item.key)})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterText: {
    color: "#374151",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
