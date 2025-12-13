// VideoCallScreen.tsx - MODERN DESIGN VERSION (FINAL FIXED HOOKS & RENDERING)
import React, { useEffect, useState, useRef } from 'react';
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
// 💡 Add LinearGradient for a subtle bottom bar effect (requires expo-linear-gradient or similar)
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
import { professionalService, Booking } from '../services/professionalService'; 
import { soundManager } from '@/lib/soundManager';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initStreamClient, joinVideoCall } from '../services/streamService'; 
import i18n from '@/lib/i18n';

const { width, height } = Dimensions.get('window');

// --- CONSTANTS ---
const PRIMARY_COLOR = '#3b82f6'; 
const ACCENT_COLOR = '#ef4444'; 
const BACKGROUND_OPACITY = 0.6; 

// --- HELPER COMPONENTS ---

function CallStats() {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const [duration, setDuration] = useState(0);

  const isJoined = callingState === CallingState.JOINED;

  useEffect(() => {
    if (isJoined) {
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
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

const ControlButton = ({ icon, label, onPress, isActive, isDanger = false }: {
    icon: string;
    label: string;
    onPress: () => void;
    isActive: boolean;
    isDanger?: boolean;
}) => (
    <Pressable
        style={({ pressed }) => ([
            styles.controlButton, 
            isDanger && styles.controlButtonDanger,
            isActive ? styles.controlButtonActive : styles.controlButtonInactive,
            isDanger && isActive && styles.controlButtonDangerActive,
            pressed && { opacity: 0.7 } 
        ])}
        onPress={onPress}
    >
        <Feather 
            name={icon as any} 
            size={28} 
            color={isActive ? (isDanger ? '#fff' : PRIMARY_COLOR) : '#fff'} 
        />
        <Text style={[styles.controlLabel, isDanger && styles.controlLabelDanger]}>
            {label}
        </Text>
    </Pressable>
);

function CustomCallControls({ onEndCall }: { onEndCall: () => void }) {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant(); 
  
  // FIX: Cast to 'any' to ensure access to properties like isMicrophoneEnabled 
  // which might be missing from the static type definition in the current Stream SDK version.
  const typedLocalParticipant = localParticipant as any; 

  const isMuted = !typedLocalParticipant?.isMicrophoneEnabled;
  const isVideoOff = !typedLocalParticipant?.isCameraEnabled;
  
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); 

  const toggleMute = async () => {
    if (!call) return;
    try {
      await call.microphone.toggle(); 
      await soundManager.play('click');
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  };

  const toggleVideo = async () => {
    if (!call) return;
    try {
      await call.camera.toggle();
      await soundManager.play('click');
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  const toggleSpeaker = async () => {
    // Placeholder for native audio routing logic
    setIsSpeakerOn(prev => !prev);
    await soundManager.play('click');
  };

  const flipCamera = async () => {
    if (!call) return;
    try {
      await call.camera.flip();
      await soundManager.play('click');
    } catch (error) {
      console.error('Error flipping camera:', error);
    }
  };

  return (
    <View style={styles.controlsContainer}>
        {/* Row 1: Core Controls (Centered) */}
        <View style={styles.controlsRow}>
            <ControlButton
                icon={isMuted ? "mic-off" : "mic"}
                label={isMuted ? "Unmute" : "Mute"} 
                onPress={toggleMute}
                isActive={isMuted} 
            />
            <ControlButton
                icon={isVideoOff ? "video-off" : "video"}
                label={isVideoOff ? "Video On" : "Video Off"}
                onPress={toggleVideo}
                isActive={isVideoOff} 
            />
            <ControlButton
                icon={"rotate-cw"}
                label={"Flip"}
                onPress={flipCamera}
                isActive={false} 
            />
        </View>

        {/* Row 2: Secondary Controls + End Call (Prominent End Call) */}
        <View style={styles.controlsEndRow}>
            <ControlButton
                icon={isSpeakerOn ? "volume-2" : "volume-x"}
                label={"Speaker"}
                onPress={toggleSpeaker}
                isActive={isSpeakerOn} 
            />
             {/* End Call Button is now a separate, prominent component */}
            <Pressable style={styles.endCallButton} onPress={handleEndCallPrompt}>
                <Feather name="phone-off" size={28} color="#fff" />
            </Pressable>
        </View>
    </View>
  );
}

// --- MAIN SCREEN ---

export default function VideoCallScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
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

  // 1. INITIALIZATION & JOIN LOGIC
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      if (!streamUserId || !callId) {
        setError(i18n.t("missing_call_parameters"));
        return;
      }
      
      try {
        // Step A: Initialize Client
        setStatus(i18n.t("connecting_to_server") || "Connecting to server...");
        const client = await initStreamClient(
          streamUserId, 
          streamUserName || 'User', 
          streamUserImage
        );
        
        if (!isMounted) return;
        setStreamClient(client);

        // Step B: Join Call 
        setStatus(i18n.t("joining_call_room") || "Joining call room...");
        const call = await joinVideoCall(client, callId); 
        
        if (!isMounted) return;
        setStreamCall(call);
        setStatus(""); 
        console.log('✅ VideoCallScreen: Successfully joined call');

        // Step C: Fade In Animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Step D: Listen for External End Events
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
          Alert.alert(
            i18n.t("connection_failed") || "Connection Failed",
            i18n.t("could_not_join_call") || "Could not connect to the call. Please try again.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        }
      }
    };

    init();
    
    return () => {
      isMounted = false;
      if (bookingListenerRef.current) {
        bookingListenerRef.current(); 
      }
    };
  }, [streamUserId, callId, bookingId]);

  // 2. BACK BUTTON HANDLER 
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (streamClient && streamCall) {
        handleEndCallPrompt();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [streamClient, streamCall]);

  const navigateAway = () => {
    if (bookingListenerRef.current) {
      bookingListenerRef.current();
      bookingListenerRef.current = null;
    }
    navigation.goBack();
  }

  // 3. REMOTE EVENT HANDLERS 
  const handleCallRejectionCleanup = async (callInstance: Call, booking: Booking) => {
    if (!callInstance || hasEndedRef.current) return;
    hasEndedRef.current = true;

    try {
      await callInstance.leave();
      if (streamClient) await streamClient.disconnectUser();
    } catch (e) {
      console.warn('Error cleanup rejection:', e);
    }

    Alert.alert(
      i18n.t("call_rejected_title") || "Call Rejected",
      i18n.t("call_rejected_message", { name: booking.professionalName || booking.patientName }) || "The call was rejected.",
      [{ text: "OK", onPress: navigateAway }]
    );
  };
  
  const handleRemoteCallEnd = async (callInstance: Call, clientInstance: StreamVideoClient) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    console.log('📴 Remote user ended the call');
    
    try {
      await callInstance.leave();
      await clientInstance.disconnectUser();
    } catch (e) {
      console.warn('Error cleanup remote end:', e);
    }

    Alert.alert(
      i18n.t("call_ended"),
      "The other person has ended the call.",
      [{ text: "OK", onPress: navigateAway }]
    );
  };

  // 4. MANUAL HANGUP LOGIC 
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
      // 1. Leave Stream Call
      await streamCall.leave();
      
      // 2. Disconnect Client
      await streamClient.disconnectUser();
      
      // 3. Complete Booking (if applicable)
      if (bookingId) {
        try {
          await professionalService.completeBooking(bookingId, null); 
          console.log('✅ Booking marked completed locally');
        } catch (error) {
          console.log('Info: Booking completion skipped or failed (might be patient side)', error);
        }
      }

      navigateAway();

    } catch (e) {
      console.error('❌ Error ending call:', e);
      // Force exit even on error
      navigateAway();
    }
  };

  // 5. LOADING / ERROR STATES
  if (!streamClient || !streamCall) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {error ? (
          <>
            <Feather name="alert-circle" size={64} color={ACCENT_COLOR} />
            <Text style={styles.errorText}>{i18n.t("connection_error")}: {error}</Text>
            <Pressable style={styles.errorButton} onPress={() => navigateAway()}>
              <Text style={styles.errorButtonText}>{i18n.t("go_back")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>{status}</Text>
          </>
        )}
      </View>
    );
  }

  // 6. MAIN RENDER
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <StreamVideo client={streamClient}>
          <StreamCall call={streamCall}>
            <View style={styles.videoContainer}>
              {/* CallContent should resolve the ThemeProvider issue if StreamVideo/StreamCall are mounted */}
              <CallContent />
            </View>

            {/* TOP BAR: Stats and Minimize */}
            <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent']}
                style={styles.topBarGradient}
            >
                <View style={styles.topBar}>
                  <CallStats />
                  <Pressable style={styles.minimizeButton} onPress={handleEndCallPrompt}>
                    <Feather name="minimize-2" size={20} color="#fff" />
                  </Pressable>
                </View>
            </LinearGradient>


            {/* BOTTOM CONTROLS: Gradient Overlay + Controls */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.bottomContainerGradient}
            >
                <View style={styles.bottomContainerContent}>
                    <CustomCallControls onEndCall={handleEndCallPrompt} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  // --- TOP BAR STYLES ---
  topBarGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 120 : 100, // Make it taller for gradient effect
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16, // Adjust for SafeAreaView/Status Bar
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `rgba(255,255,255,${BACKGROUND_OPACITY * 0.3})`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  minimizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `rgba(255,255,255,${BACKGROUND_OPACITY * 0.3})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // --- BOTTOM CONTROLS STYLES ---
  bottomContainerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 200 : 180, // Taller for gradient
    zIndex: 10,
  },
  bottomContainerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  controlsContainer: {
    paddingVertical: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlsEndRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30, // Gap between speaker and end call
  },
  // Modern, minimal buttons
  controlButton: {
    width: 70, // Slightly smaller width
    height: 70, // Square shape
    borderRadius: 35, // Full circle
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `rgba(255,255,255,${BACKGROUND_OPACITY * 0.1})`, // Default transparent background
  },
  controlButtonInactive: {
     backgroundColor: `rgba(255,255,255,${BACKGROUND_OPACITY * 0.1})`, // Dark background for inactive
  },
  controlButtonActive: {
    backgroundColor: `#fff`, // White background for active
  },
  controlButtonDanger: {
    backgroundColor: ACCENT_COLOR, // Red for danger/end call
  },
  controlButtonDangerActive: {
    backgroundColor: ACCENT_COLOR, // Keep red
  },
  // Label moved below the button, but only for controls in controlsRow
  controlLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    position: 'absolute',
    bottom: -20, // Position label below the circle button
    width: 100,
    textAlign: 'center',
  },
  controlLabelDanger: {
    // Hide label for the main end call button as it's just the icon
    display: 'none', 
  },
  // Prominent End Call Button
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  // Error Styles (Kept largely the same for high visibility)
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});