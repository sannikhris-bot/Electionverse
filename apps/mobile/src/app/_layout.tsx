import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

export default function RootLayout() {
  const load = useGame((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
