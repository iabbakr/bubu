import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServicesScreen from "@/screens/ServicesScreen";
import AirtimeScreen from "@/screens/AirtimeScreen";
import DataScreen from "@/screens/DataScreen";
import ElectricityScreen from "@/screens/ElectricityScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import ProfessionalsScreen from "@/screens/ProfessionalsScreen";
import VideoCallScreen from "@/screens/VideoCallScreen";
import CallHistoryScreen from "@/screens/CallHistoryScreen";
import TVScreen from "@/screens/TVScreen";
import PatientCallHistoryScreen from "@/screens/PatientCallHistoryScreen";

export type ServicesStackParamList = {
  Services: undefined;
  Airtime: undefined;
  Data: undefined;
  CableTV: undefined;
  Electricity: undefined;
  Education: undefined;
  Professionals: { type?: "doctor" | "pharmacist" | "therapist" };
  VideoCall: {
    client: any;
    call: any;
    bookingId: string;
    streamUserId: string, 
    streamUserName: string, 
    streamUserImage?: string, 
    callId: string,
  };
  CallHistory: undefined;
  PatientCallHistory: undefined;
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
        name="CableTV" 
        component={TVScreen}
        options={{ title: "Pay TV" }}
      />

      <Stack.Screen
        name="Professionals"
        component={ProfessionalsScreen}
        options={{ title: "Healthcare Professionals" }}
      />
    
    
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{
          headerShown: false,
          gestureEnabled: false, // Prevent swipe to go back during call
        }}
      />
      
      {/* Call History */}
      <Stack.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={{ title: "Call History" }}
      />
     <Stack.Screen
        name="PatientCallHistory"
        component={PatientCallHistoryScreen}
        options={{ title: "Call History" }}
      />
    </Stack.Navigator>

  );
}