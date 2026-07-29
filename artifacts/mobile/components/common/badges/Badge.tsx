import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Badge({text}:{text:string}){
  return(
    <View style={styles.badge}>
      <Text>{text}</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  badge:{
    paddingHorizontal:8,
    paddingVertical:3,
    borderRadius:999
  }
});
