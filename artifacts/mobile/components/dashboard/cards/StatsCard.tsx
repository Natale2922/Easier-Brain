import React from 'react';
import { View, Text } from 'react-native';

export default function StatsCard({title,value}:{title:string,value:number}){
  return(
    <View style={{padding:16,borderRadius:16,borderWidth:1}}>
      <Text>{title}</Text>
      <Text style={{fontSize:28,fontWeight:'700'}}>{value}</Text>
    </View>
  );
}
