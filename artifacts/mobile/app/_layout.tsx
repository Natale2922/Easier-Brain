import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { TasksProvider } from '@/context/TasksContext';
import { AcademicProvider } from '@/context/AcademicContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GradesProvider } from '@/context/GradesContext';
import { useColors } from '@/hooks/useColors';
import { displayFontFamily } from '@/theme/typography';
import { SaveCampusAccountPrompt } from '@/components/auth/SaveCampusAccountPrompt';
import { isCampusCredentialStorageAvailable } from '@/utils/campusCredentialVault';

// Set up API base URL for Expo (outside web proxy)
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const onLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !onLoginScreen) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  const colors = useColors();
  const {
    legacyCredentialConsentPending,
    legacyCredentialUsername,
    resolveLegacyCredentialConsent,
  } = useAuth();
  const [canSaveLegacyCredentials, setCanSaveLegacyCredentials] = useState(false);
  const [checkedLegacyStorage, setCheckedLegacyStorage] = useState(false);

  useEffect(() => {
    if (!legacyCredentialConsentPending) {
      setCheckedLegacyStorage(false);
      return;
    }
    let active = true;
    isCampusCredentialStorageAvailable().then(available => {
      if (!active) return;
      setCanSaveLegacyCredentials(available);
      setCheckedLegacyStorage(true);
    });
    return () => {
      active = false;
    };
  }, [legacyCredentialConsentPending]);

  return (
    <>
      <AuthGuard />
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="accounts" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            title: 'Nueva Tarea',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerTitleStyle: {
              fontFamily: displayFontFamily,
              color: colors.foreground,
            },
          }}
        />
      </Stack>
      <SaveCampusAccountPrompt
        visible={legacyCredentialConsentPending && checkedLegacyStorage}
        canSave={canSaveLegacyCredentials}
        username={legacyCredentialUsername}
        title="¿Guardar esta cuenta de forma segura?"
        description={
          canSaveLegacyCredentials
            ? 'Se encontró una contraseña guardada por una versión anterior. Puedes conservarla cifrada en este dispositivo para seguir cambiando de cuenta y renovar la sesión.'
            : 'No se puede guardar una contraseña de forma cifrada en este dispositivo. Si continúas, se eliminará el acceso guardado anterior.'
        }
        saveLabel="Guardar de forma segura"
        continueLabel="No guardar y eliminar"
        onSave={async () => {
          const result = await resolveLegacyCredentialConsent(true);
          if (!result.completed || !result.saved) {
            Alert.alert(
              result.completed ? 'No se guardó la cuenta' : 'No se pudo eliminar la contraseña anterior',
              result.completed
                ? 'La contraseña anterior se eliminó. Inicia sesión de nuevo cuando la sesión expire.'
                : 'Vuelve a intentarlo para completar la migración de forma segura.',
            );
          }
        }}
        onContinueWithoutSaving={async () => {
          const result = await resolveLegacyCredentialConsent(false);
          if (!result.completed) {
            Alert.alert('No se pudo eliminar la contraseña anterior', 'Vuelve a intentarlo para quitar el acceso guardado en texto sin cifrar.');
          }
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <AcademicProvider>
                  <GradesProvider>
                    <TasksProvider>
                      <RootLayoutNav />
                    </TasksProvider>
                  </GradesProvider>
                </AcademicProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
