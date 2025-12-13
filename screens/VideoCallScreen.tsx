// VideoCallScreen.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  BackHandler, 
  Pressable,
  Text,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator, 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import {
  StreamVideo,
  StreamCall,
  CallContent,
  useCall,
  useCallStateHooks,
  StreamVideoClient,
  Call,
  CallingState, 
} from '@stream-io/video-react-native-sdk';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Hooks
import { professionalService, Booking } from '../services/professionalService'; 
import { soundManager } from '@/lib/soundManager';
import { initStreamClient, joinVideoCall } from '../services/streamService'; 
import i18n from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme'; // <--- IMPORT THIS

const { width, height } = Dimensions.get('window');

// --- HELPER COMPONENTS ---

function CallStats() {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const [duration, setDuration] = useState(0);
  const isJoined = callingState === CallingState.JOINED;

  useEffect(() => {
    if (isJoined) {
      const interval = setInterval(() => setDuration(prev => prev + 1), 1000);
      return () => clearInterval(interval);
    }
    if (callingState === CallingState.OFFLINE || callingState === CallingState.RINGING) {
        setDuration(0);
    }
  }, [isJoined, callingState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isJoined) return null; 

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Feather name="users" size={16} color="#fff" />
        <Text style={styles.statText}>{participants.length}</Text>
      </View>
      <View style={styles.statItem}>
        <Feather name="clock" size={16} color="#fff" />
        <Text style={styles.statText}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}

// ControlButton now accepts colors as props
const ControlButton = ({ icon, label, onPress, isActive, isDanger = false, activeColor }: {
    icon: string;
    label: string;
    onPress: () => void;
    isActive: boolean;
    isDanger?: boolean;
    activeColor: string;
}) => (
    <Pressable
        style={({ pressed }) => ([
            styles.controlButton, 
            isDanger && styles.controlButtonDanger,
            isActive ? { backgroundColor: isDanger ? '#ef4444' : '#fff' } : styles.controlButtonInactive,
            pressed && { opacity: 0.7 } 
        ])}
        onPress={onPress}
    >
        <Feather 
            name={icon as any} 
            size={28} 
            color={isActive ? (isDanger ? '#fff' : activeColor) : '#fff'} 
        />
        <Text style={[styles.controlLabel, isDanger && styles.controlLabelDanger]}>
            {label}
        </Text>
    </Pressable>
);

function CustomCallControls({ onEndCall, themePrimary }: { onEndCall: () => void, themePrimary: string }) {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant(); 
  const typedLocalParticipant = localParticipant as any; 

  const isMuted = !typedLocalParticipant?.isMicrophoneEnabled;
  const isVideoOff = !typedLocalParticipant?.isCameraEnabled;
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); 

  const toggleMute = async () => {
    if (!call) return;
    await call.microphone.toggle(); 
    await soundManager.play('click');
  };

  const toggleVideo = async () => {
    if (!call) return;
    await call.camera.toggle();
    await soundManager.play('click');
  };

  const toggleSpeaker = async () => {
    setIsSpeakerOn(prev => !prev);
    await soundManager.play('click');
  };

  const flipCamera = async () => {
    if (!call) return;
    await call.camera.flip();
    await soundManager.play('click');
  };

  return (
    <View style={styles.controlsContainer}>
        {/* Row 1: Core Controls */}
        <View style={styles.controlsRow}>
            <ControlButton
                icon={isMuted ? "mic-off" : "mic"}
                label={isMuted ? "Unmute" : "Mute"} 
                onPress={toggleMute}
                isActive={isMuted} 
                activeColor={themePrimary}
            />
            <ControlButton
                icon={isVideoOff ? "video-off" : "video"}
                label={isVideoOff ? "Video On" : "Video Off"}
                onPress={toggleVideo}
                isActive={isVideoOff} 
                activeColor={themePrimary}
            />
            <ControlButton
                icon={"rotate-cw"}
                label={"Flip"}
                onPress={flipCamera}
                isActive={false} 
                activeColor={themePrimary}
            />
        </View>

        {/* Row 2: Secondary Controls + End Call */}
        <View style={styles.controlsEndRow}>
            <ControlButton
                icon={isSpeakerOn ? "volume-2" : "volume-x"}
                label={"Speaker"}
                onPress={toggleSpeaker}
                isActive={isSpeakerOn} 
                activeColor={themePrimary}
            />
            <Pressable style={styles.endCallButton} onPress={onEndCall}>
                <Feather name="phone-off" size={28} color="#fff" />
            </Pressable>
        </View>
    </View>
  );
}

// --- MAIN SCREEN ---

export default function VideoCallScreen() {
  // 1. Hook Usage (Must be top level)
  const { theme, isDark } = useTheme(); // <--- Correctly accessing context
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // 2. Constants derived from Theme
  const PRIMARY_COLOR = theme.primary || '#3b82f6';
  const ACCENT_COLOR = theme.error || '#ef4444';

  const { 
    streamUserId, 
    streamUserName, 
    streamUserImage, 
    callId, 
    bookingId 
  } = route.params as { 
    streamUserId: string, 
    streamUserName: string, 
    streamUserImage?: string, 
    callId: string, 
    bookingId: string 
  };

  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [streamCall, setStreamCall] = useState<Call | null>(null);
  const [isCallEnding, setIsCallEnding] = useState(false);
  const [status, setStatus] = useState("Initializing..."); 
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bookingListenerRef = useRef<(() => void) | null>(null);
  const hasEndedRef = useRef(false);

  // 3. Initialization Logic
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      if (!streamUserId || !callId) {
        setError(i18n.t("missing_call_parameters"));
        return;
      }
      
      try {
        setStatus(i18n.t("connecting_to_server") || "Connecting to server...");
        const client = await initStreamClient(
          streamUserId, 
          streamUserName || 'User', 
          streamUserImage
        );
        
        if (!isMounted) return;
        setStreamClient(client);

        setStatus(i18n.t("joining_call_room") || "Joining call room...");
        const call = await joinVideoCall(client, callId); 
        
        if (!isMounted) return;
        setStreamCall(call);
        setStatus(""); 
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        if (bookingId) {
          bookingListenerRef.current = professionalService.listenToBooking(bookingId, async (booking) => {
            if (booking.status === 'rejected_during_call') {
              await handleCallRejectionCleanup(call, booking); 
            } else if (booking.status === 'completed' && !hasEndedRef.current) {
              await handleRemoteCallEnd(call, client);
            }
          });
        }

      } catch (e: any) {
        console.error('VideoCallScreen: Failed to initialize/join:', e);
        if (isMounted) {
          setError(e.message || i18n.t("failed_to_connect_video_service"));
        }
      }
    };

    init();
    
    return () => {
      isMounted = false;
      if (bookingListenerRef.current) bookingListenerRef.current(); 
    };
  }, [streamUserId, callId, bookingId]);

  // 4. Handlers
  const handleCallRejectionCleanup = async (callInstance: Call, booking: Booking) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    try {
      await callInstance.leave();
      if (streamClient) await streamClient.disconnectUser();
    } catch (e) { console.warn(e); }
    
    Alert.alert(i18n.t("call_rejected_title"), i18n.t("call_rejected_message"), [{ text: "OK", onPress: navigateAway }]);
  };
  
  const handleRemoteCallEnd = async (callInstance: Call, clientInstance: StreamVideoClient) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    try {
      await callInstance.leave();
      await clientInstance.disconnectUser();
    } catch (e) { console.warn(e); }
    Alert.alert(i18n.t("call_ended"), "The other person has ended the call.", [{ text: "OK", onPress: navigateAway }]);
  };

  const navigateAway = () => {
    if (bookingListenerRef.current) {
      bookingListenerRef.current();
      bookingListenerRef.current = null;
    }
    navigation.goBack();
  }

  const handleEndCallPrompt = () => {
    Alert.alert(
      i18n.t("end_call"),
      i18n.t("confirm_end_consultation"),
      [
        { text: i18n.t("cancel"), style: "cancel" },
        { text: i18n.t("end_call"), style: "destructive", onPress: handleEndCall }
      ]
    );
  };

  const handleEndCall = async () => {
    if (isCallEnding || !streamClient || !streamCall || hasEndedRef.current) return; 
    hasEndedRef.current = true;
    setIsCallEnding(true);
    await soundManager.play('click');

    try {
      await streamCall.leave();
      await streamClient.disconnectUser();
      if (bookingId) await professionalService.completeBooking(bookingId, null); 
      navigateAway();
    } catch (e) {
      navigateAway();
    }
  };

  // 5. Render Loading/Error
  if (!streamClient || !streamCall) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {error ? (
          <>
            <Feather name="alert-circle" size={64} color={ACCENT_COLOR} />
            <Text style={styles.errorText}>{i18n.t("connection_error")}: {error}</Text>
            <Pressable style={[styles.errorButton, { backgroundColor: PRIMARY_COLOR }]} onPress={() => navigateAway()}>
              <Text style={styles.errorButtonText}>{i18n.t("go_back")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>{status}</Text>
          </>
        )}
      </View>
    );
  }

  // 6. Main Render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <StreamVideo client={streamClient}>
          <StreamCall call={streamCall}>
            <View style={styles.videoContainer}>
              <CallContent />
            </View>

            {/* Top Bar */}
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topBarGradient}>
                <View style={styles.topBar}>
                  <CallStats />
                  <Pressable style={styles.minimizeButton} onPress={handleEndCallPrompt}>
                    <Feather name="minimize-2" size={20} color="#fff" />
                  </Pressable>
                </View>
            </LinearGradient>

            {/* Bottom Controls */}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomContainerGradient}>
                <View style={styles.bottomContainerContent}>
                    <CustomCallControls onEndCall={handleEndCallPrompt} themePrimary={PRIMARY_COLOR} />
                </View>
            </LinearGradient>

            {isCallEnding && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>{i18n.t("ending_call")}...</Text>
                </View>
              </View>
            )}
          </StreamCall>
        </StreamVideo>
      </Animated.View>
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  topBarGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 120 : 100, zIndex: 10 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16 },
  statsContainer: { flexDirection: 'row', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `rgba(255,255,255,0.2)`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  minimizeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: `rgba(255,255,255,0.2)`, justifyContent: 'center', alignItems: 'center' },
  bottomContainerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 200 : 180, zIndex: 10 },
  bottomContainerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 34 : 16, paddingHorizontal: 16, paddingTop: 20 },
  controlsContainer: { paddingVertical: 10 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  controlsEndRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  controlButton: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  controlButtonInactive: { backgroundColor: `rgba(255,255,255,0.1)` },
  controlButtonDanger: { backgroundColor: '#ef4444' },
  controlLabel: { color: '#fff', fontSize: 11, fontWeight: '500', position: 'absolute', bottom: -20, width: 100, textAlign: 'center' },
  controlLabelDanger: { display: 'none' },
  endCallButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingContent: { alignItems: 'center', gap: 16 },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 20 },
  errorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 32, textAlign: 'center' },
  errorButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});