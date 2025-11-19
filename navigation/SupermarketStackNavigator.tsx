import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SupermarketScreen from "@/screens/SupermarketScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";

export type SupermarketStackParamList = {
  Supermarket: undefined;
};

const Stack = createNativeStackNavigator<SupermarketStackParamList>();

export default function SupermarketStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Supermarket"
        component={SupermarketScreen}
        options={{
          headerTitle: () => <HeaderTitle title="MarketHub" />,
        }}
      />
    </Stack.Navigator>
  );
}
