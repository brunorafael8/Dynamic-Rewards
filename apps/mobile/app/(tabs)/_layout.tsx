import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useThemeContext } from '../../lib/theme-context';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme === 'dark' ? '#3B82F6' : '#123769',
        tabBarInactiveTintColor: theme === 'dark' ? '#94A3B8' : '#818988',
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderTopColor: theme === 'dark' ? '#334155' : '#E5E7EB',
        },
        headerStyle: {
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
        },
        headerTintColor: theme === 'dark' ? '#E2E8F0' : '#666D80',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rules',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 15 }}>
              <FontAwesome
                name={theme === 'dark' ? 'sun-o' : 'moon-o'}
                size={22}
                color={theme === 'dark' ? '#E2E8F0' : '#666D80'}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="processing"
        options={{
          title: 'Process',
          tabBarIcon: ({ color }) => <TabBarIcon name="bolt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
