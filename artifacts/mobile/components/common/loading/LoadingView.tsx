import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    alignItems:'center',
    justifyContent:'center'
  }
});
