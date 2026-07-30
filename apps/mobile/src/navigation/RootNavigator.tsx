import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { useTheme } from '../theme/tokens';

// docs/01 §3 — Ana navigasyon: Keşfet, Ara, Ekle, Kaydedilenler, Profil
export type RootTabParamList = {
  Explore: undefined;
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

export function RootNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();

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

  return (
    <NavigationContainer theme={navigationTheme}>
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
        <Tab.Screen
          name="Add"
          component={AddPlaceScreen}
          options={{ tabBarLabel: t('tabs.add') }}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={{ tabBarLabel: t('tabs.saved') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: t('tabs.profile') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
