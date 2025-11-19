import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PharmacyScreen from "@/screens/PharmacyScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type PharmacyStackParamList = {
  Pharmacy: undefined;
};

const Stack = createNativeStackNavigator<PharmacyStackParamList>();

export default function PharmacyStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Pharmacy"
        component={PharmacyScreen}
        options={{
          title: "Pharmacy",
        }}
      />
    </Stack.Navigator>
  );
}
