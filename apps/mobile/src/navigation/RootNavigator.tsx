import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { AuthScreen } from '../screens/onboarding/AuthScreen';
import { VerifyEmailGate } from '../screens/onboarding/VerifyEmailGate';
import { LanguageSelectScreen } from '../screens/onboarding/LanguageSelectScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

import type { PlaceListItem } from '../api/places';
import { CompareScreen } from '../screens/CompareScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';

export type RootStackParamList = {
  Main: { screen?: keyof RootTabParamList; params?: RootTabParamList[keyof RootTabParamList] };
  PlaceDetail: { placeId: string; fallback?: PlaceListItem };
  UserProfile: { userId: string; displayName?: string };
  Compare: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// docs/01 §3 — Ana navigasyon: Keşfet, Ara, Ekle, Kaydedilenler, Profil
export type RootTabParamList = {
  // Nokta detayından "haritada gör" ile gelindiğinde odaklanılacak nokta
  Explore: { focusPlaceId?: string; latitude?: number; longitude?: number } | undefined;
  Search: undefined;
  Add: undefined;
  Saved: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Explore: 'compass',
  Search: 'search',
  Add: 'add-circle',
  Saved: 'bookmark',
  Profile: 'person',
};

function MainTabs() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={
              focused
                ? TAB_ICONS[route.name]
                : (`${TAB_ICONS[route.name]}-outline` as keyof typeof Ionicons.glyphMap)
            }
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarLabel: t('tabs.explore') }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: t('tabs.search') }}
      />
      <Tab.Screen name="Add" component={AddPlaceScreen} options={{ tabBarLabel: t('tabs.add') }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarLabel: t('tabs.saved') }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

/**
 * İlk açılış akışı (docs/01 §4): dil seçimi → onboarding → giriş/kayıt (veya misafir) → uygulama.
 */
export function RootNavigator() {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const { hydrated, language, onboarded, isGuest, user, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (language && i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      primary: theme.colors.primary,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
    },
  };

  let content: React.ReactNode;
  if (!hydrated) {
    content = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  } else if (!language) {
    content = <LanguageSelectScreen />;
  } else if (!onboarded) {
    content = <OnboardingScreen />;
  } else if (!user && !isGuest) {
    content = <AuthScreen />;
  } else if (user && !user.emailVerified) {
    // Doğrulamadan uygulamaya girilemez; misafir olarak devam seçeneği ekranda
    content = <VerifyEmailGate />;
  } else {
    content = (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      </Stack.Navigator>
    );
  }

  return <NavigationContainer theme={navigationTheme}>{content}</NavigationContainer>;
}
