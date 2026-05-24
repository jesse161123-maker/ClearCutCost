import React from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import FloatingTabBar from '@/components/FloatingTabBar';
import { Stack } from 'expo-router';

const TABS = [
  { name: '(home)', route: '/(tabs)/(home)' as const, icon: 'home' as const, label: 'Home' },
  { name: 'history', route: '/(tabs)/history' as const, icon: 'history' as const, label: 'History' },
  { name: 'settings', route: '/(tabs)/settings' as const, icon: 'settings' as const, label: 'Settings' },
];

export default function TabLayout() {
  useSubscriptionGuard();
  const pathname = usePathname();

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="settings/index" />
      </Stack>
      <FloatingTabBar
        tabs={TABS}
        containerWidth={280}
        borderRadius={35}
        bottomMargin={20}
      />
    </View>
  );
}
