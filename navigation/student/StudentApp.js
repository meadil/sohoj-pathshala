import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function StudentApp() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.badge}>STUDENT TARGET</Text>
      <Text style={styles.title}>Sohoj Pathshala</Text>
      <Text style={styles.subtitle}>Student App Tree</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF7F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2703D',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6E6E73',
  },
});
