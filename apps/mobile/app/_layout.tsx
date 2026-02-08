import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { TamaguiProvider, Theme } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import config from '../tamagui.config';
import { queryClient } from '../lib/api';
import { ThemeProvider as CustomThemeProvider, useThemeContext } from '../lib/theme-context';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { theme } = useThemeContext();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Theme name={theme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </Theme>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      <CustomThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </CustomThemeProvider>
    </TamaguiProvider>
  );
}
