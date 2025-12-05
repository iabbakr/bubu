import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServicesScreen from "@/screens/ServicesScreen";
import AirtimeScreen from "@/screens/AirtimeScreen";
import DataScreen from "@/screens/DataScreen";
import ElectricityScreen from "@/screens/ElectricityScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import ProfessionalsScreen from "@/screens/ProfessionalsScreen";

export type ServicesStackParamList = {
  Services: undefined;
  Airtime: undefined;
  Data: undefined;
  TV: undefined;
  Electricity: undefined;
  Education: undefined;
  Professionals: { type?: "doctor" | "pharmacist" | "therapist" };
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export default function ServicesStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: "Services" }}
      />
      <Stack.Screen 
        name="Airtime" 
        component={AirtimeScreen}
        options={{ title: "Buy Airtime" }}
      />
      <Stack.Screen 
        name="Data" 
        component={DataScreen}
        options={{ title: "Buy Data" }}
      />
      <Stack.Screen 
        name="Electricity" 
        component={ElectricityScreen}
        options={{ title: "Pay Electricity" }}
      />
      <Stack.Screen
        name="Professionals"
        component={ProfessionalsScreen}
        options={{ title: "Healthcare Professionals" }}
      />
    </Stack.Navigator>
  );
}