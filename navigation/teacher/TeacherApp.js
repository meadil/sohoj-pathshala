import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  TeacherDashboardScreen,
  TeacherPaymentsScreen,
} from '../../screens/teacher/tabs';
import TeacherCoursesStack from './TeacherCoursesStack';
import TeacherStudentsStack from './TeacherStudentsStack';
import TeacherMoreStack from './TeacherMoreStack';
import { colors } from '../../theme/theme';

const Tab = createBottomTabNavigator();

const TAB_META = {
  Dashboard: { icon: 'home', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard' },
  Courses: { icon: 'book', labelBn: 'কোর্স', labelEn: 'Courses' },
  Students: { icon: 'account-group', labelBn: 'শিক্ষার্থী', labelEn: 'Students' },
  Payments: { icon: 'credit-card', labelBn: 'পেমেন্ট', labelEn: 'Payments' },
  More: { icon: 'dots-horizontal', labelBn: 'আরও', labelEn: 'More' },
};

/**
 * TeacherApp - Teacher/Owner main tab navigator.
 * 5 tabs with verbatim labels (ড্যাশবোর্ড/কোর্স/শিক্ষার্থী/পেমেন্ট/
 * আরও). Icons via @expo/vector-icons MaterialCommunityIcons: the
 * brief named Feather icons (users, more-horizontal — not in MCI),
 * so account-group and dots-horizontal are the MCI equivalents.
 * Dashboard tab hosts the role-aware TeacherDashboardScreen; the
 * other four tabs are stubs until their slices.
 */
export default function TeacherApp() {
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
            height: 64,
          },
          tabBarLabelStyle: {
            fontFamily: 'HindSiliguri-SemiBold',
            fontSize: 11,
          },
          tabBarIcon: ({ color }) => (
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
          component={TeacherDashboardScreen}
          options={{ tabBarLabel: isBn ? TAB_META.Dashboard.labelBn : TAB_META.Dashboard.labelEn }}
        />
      <Tab.Screen
        name="Courses"
        component={TeacherCoursesStack}
          options={{ tabBarLabel: isBn ? TAB_META.Courses.labelBn : TAB_META.Courses.labelEn }}
        />
      <Tab.Screen
        name="Students"
        component={TeacherStudentsStack}
          options={{ tabBarLabel: isBn ? TAB_META.Students.labelBn : TAB_META.Students.labelEn }}
        />
        <Tab.Screen
          name="Payments"
          component={TeacherPaymentsScreen}
          options={{ tabBarLabel: isBn ? TAB_META.Payments.labelBn : TAB_META.Payments.labelEn }}
        />
      <Tab.Screen
        name="More"
        component={TeacherMoreStack}
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
