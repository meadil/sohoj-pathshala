import React, { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CourseStackNavigator from './CourseStackNavigator';
import ExploreStackNavigator from './ExploreStackNavigator';
import ReportStackNavigator from './ReportStackNavigator';
import MoreStackNavigator from './MoreStackNavigator';
import { colors } from '../../theme/theme';

const Tab = createBottomTabNavigator();

const TAB_META = {
  Dashboard: { icon: 'home', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard' },
  Explore: { icon: 'compass-outline', labelBn: 'এক্সপ্লোর', labelEn: 'Explore' },
  Report: { icon: 'chart-bar', labelBn: 'লার্নিং রিপোর্ট', labelEn: 'Learning Report' },
  More: { icon: 'dots-horizontal', labelBn: 'আরও', labelEn: 'More' },
};

/**
 * StudentApp - Student main tab navigator (sp-tabbar).
 * Matches index.html#sp-tabbar: 4 tabs (Dashboard, Explore, Learning
 * Report, More) with active-state primary color. Uses
 * createBottomTabNavigator (v7 screenOptions API — the brief's
 * tabBarOptions name is the v5 API) styled to the tabbar tokens
 * (surface bg, top border, label font, 24px icons).
 * Tab icons come from @expo/vector-icons (Expo Go compatible) instead
 * of react-native-vector-icons (needs native linking, not Expo Go
 * compatible): home / compass-outline / chart-bar / dots-horizontal.
 * Android cutoff fix: the whole navigator sits in a bottom-edged
 * SafeAreaView (inset handled by the OS contribution, not a hardcoded
 * padding) with tabBarStyle paddingBottom 0 so the bar sits flush.
 */
export default function StudentApp() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const isBn = lang === 'bn';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 2,
            borderTopColor: colors.border,
            paddingBottom: 0,
            height: 64, // explicit bar height (sits above the OS inset)
          },
          tabBarLabelStyle: {
            fontFamily: 'HindSiliguri-SemiBold',
            fontSize: 11, // smaller labels fit better
            marginBottom: Platform.OS === 'android' ? 4 : 0,
          },
          tabBarIconStyle: {
            marginBottom: Platform.OS === 'android' ? 2 : 0,
          },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={TAB_META[route.name].icon}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={CourseStackNavigator}
        options={{ tabBarLabel: isBn ? TAB_META.Dashboard.labelBn : TAB_META.Dashboard.labelEn }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreStackNavigator}
        options={{ tabBarLabel: isBn ? TAB_META.Explore.labelBn : TAB_META.Explore.labelEn }}
      />
      <Tab.Screen
        name="Report"
        component={ReportStackNavigator}
        options={{ tabBarLabel: isBn ? TAB_META.Report.labelBn : TAB_META.Report.labelEn }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ tabBarLabel: isBn ? TAB_META.More.labelBn : TAB_META.More.labelEn }}
      />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
