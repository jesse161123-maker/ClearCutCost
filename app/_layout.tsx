import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Alert } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();

  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "You're offline",
        "Check your connection and try again."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: '#1E3A5F',
      background: '#F7F7F5',
      card: '#FFFFFF',
      text: '#1F2937',
      border: 'rgba(31,41,55,0.08)',
      notification: '#DC2626',
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: '#4A7FBF',
      background: '#111318',
      card: '#1C1F26',
      text: '#F0F0EE',
      border: 'rgba(255,255,255,0.08)',
      notification: '#EF4444',
    },
  };

  if (!loaded) {
    return null;
  }

  return (
    <SubscriptionProvider>
      <DevErrorBoundary>
        <StatusBar style="auto" animated />
        <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
          <SafeAreaProvider>
            <WidgetProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack>
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="upload"
                    options={{
                      presentation: 'formSheet',
                      sheetGrabberVisible: true,
                      sheetAllowedDetents: [0.85, 1.0],
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="analysis/[id]"
                    options={{
                      headerShown: true,
                      headerTransparent: true,
                      headerShadowVisible: false,
                      headerBackButtonDisplayMode: 'minimal',
                      headerTitle: '',
                    }}
                  />
                  <Stack.Screen
                    name="paywall"
                    options={{ headerShown: false, presentation: 'modal' }}
                  />
                </Stack>
                <SystemBars style="auto" />
              </GestureHandlerRootView>
            </WidgetProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DevErrorBoundary>
    </SubscriptionProvider>
  );
}
