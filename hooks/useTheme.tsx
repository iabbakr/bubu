import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { settingsService } from '@/services/settingsService';
import { useAuth } from '@/hooks/useAuth';

interface ThemeContextType {
  theme: typeof Colors.light;
  isDark: boolean;
  toggleTheme: (shouldBeDark: boolean) => void;
  userThemePreference: 'light' | 'dark' | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [userThemePreference, setUserThemePreference] = useState<'light' | 'dark' | null>(null);
  const { user } = useAuth();

  const activeColorScheme = userThemePreference ?? systemColorScheme ?? 'light';
  const isDark = activeColorScheme === 'dark';
  const theme = Colors[activeColorScheme];

  const toggleTheme = (shouldBeDark: boolean) => {
    const newPreference = shouldBeDark ? 'dark' : 'light';
    setUserThemePreference(newPreference);
  };

  useEffect(() => {
    if (user?.uid) {
      settingsService
        .getUserSettings(user.uid)
        .then((settings) => {
          if (settings.theme === 'light' || settings.theme === 'dark') {
            setUserThemePreference(settings.theme);
          }
        })
        .catch((err) => {
          console.error('Failed to load saved theme preference:', err);
        });
    }
  }, [user]);

  const contextValue = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
      userThemePreference,
    }),
    [theme, isDark, userThemePreference]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};