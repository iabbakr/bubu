// components/IncomingCallModal.tsx - FIXED: Props Interface
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Modal, 
  Image, 
  Pressable, 
  StyleSheet, 
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IncomingCallData, notificationService } from '../services/notificationService';
import { initStreamClient, joinVideoCall } from '../services/streamService';
import { soundManager } from '@/lib/soundManager';
import * as Notifications from 'expo-notifications';
import { professionalService } from '@/services/professionalService';
import i18n from '@/lib/i18n';

const { width, height } = Dimensions.get('window');
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

const COLORS = {
  primary: '#0066CC',
  error: '#dc2626',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// 🌟 FIX: Updated the type definition to accept bookingId: string and return a Promise<void>
interface IncomingCallModalProps {
  callData: IncomingCallData;
  onAccept: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string) => Promise<void>;
  navigation: any;
  userId: string;
}

export const IncomingCallModal = ({
  callData,
  onAccept,
  onReject,
  navigation,
  userId,
}: IncomingCallModalProps) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));
  const [joining, setJoining] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Incoming call...');

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  // 🌟 FIX: The modal now calls the passed function *with* the bookingId
  const handleAccept = async () => {
    if (!userId || joining) return;
    if (!callData.bookingId) {
      Alert.alert(i18n.t("error"), "Missing Booking ID.");
      return;
    }
    
    await Notifications.dismissAllNotificationsAsync();
    soundManager.stop?.('ringtone');

    setJoining(true);
    setStatusMessage('Connecting to call...');

    try {
      // 1. Initialize Client
      setStatusMessage('Initializing video service...');
      const streamClient = await initStreamClient(
        userId,
        'Patient',
        undefined
      );
      console.log('✅ Stream client initialized');

      // 2. Use robust join with better retry logic
      setStatusMessage('Joining consultation...');
      console.log('📞 Attempting to join call:', callData.callId);
      
      const call = await joinVideoCall(streamClient, callData.callId);
      console.log('✅ Successfully joined call');
      
      // 3. Trigger the external onAccept handler passing the bookingId
      await onAccept(callData.bookingId); // ⬅️ The fix is here (calling the passed function with ID)

      // 4. Navigate to full-screen call
      setStatusMessage('Opening video call...');
      navigation.navigate('VideoCall', {
        streamUserId: userId,
        streamUserName: 'Patient',
        streamUserImage: undefined, 
        callId: callData.callId,
        bookingId: callData.bookingId,
      });

      // 5. No need to clear incoming call here, onAccept handles cleanup in App.tsx
      
    } catch (error: any) {
      console.error('❌ Failed to join call:', error);
      
      let errorMessage = error.message || i18n.t("failed_to_join_call");
      
      if (errorMessage.includes("Can't find call")) {
        errorMessage = "The call is not ready yet. The professional may still be connecting. Please wait a moment and try again.";
      } else if (errorMessage.includes("Could not join call after multiple attempts")) {
        errorMessage = "Unable to connect to the call after multiple attempts. The professional may have ended the call or there may be a connection issue.";
      }
      
      Alert.alert(
        i18n.t("error"), 
        errorMessage,
        [
          {
            text: "Try Again",
            onPress: () => {
              setJoining(false);
              setStatusMessage('Incoming call...');
            }
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleReject
          }
        ]
      );
      setJoining(false);
      setStatusMessage('Connection failed');
    }
  };

  const handleReject = async () => {
    if (!userId || rejecting) return;
    if (!callData.bookingId) {
      Alert.alert(i18n.t("error"), "Missing Booking ID.");
      return;
    }

    setRejecting(true);
    await Notifications.dismissAllNotificationsAsync();
    soundManager.stop?.('ringtone');

    try {
      await professionalService.rejectCall(callData.bookingId, userId);
      
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start(async () => {
        // Trigger the external onReject handler passing the bookingId
        await onReject(callData.bookingId); // ⬅️ The fix is here (calling the passed function with ID)
        // No need to clear incoming call here, onReject handles cleanup in App.tsx
      });
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      setRejecting(false);
      Alert.alert(i18n.t("error"), "Failed to reject call");
    }
  };

  const glowInterpolate = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const backgroundColor = callData.isEmergency ? '#991b1b' : '#1e3a8a';
  const badgeColor = callData.isEmergency ? '#fef2f2' : '#dbeafe';
  const badgeTextColor = callData.isEmergency ? '#991b1b' : '#1e3a8a';

  return (
    <Modal 
      visible 
      animationType="none" 
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.View 
        style={[
          styles.container,
          { 
            backgroundColor,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.backgroundPattern} />

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Feather 
              name={callData.isEmergency ? "zap" : "video"} 
              size={16} 
              color={badgeTextColor} 
            />
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>
              {callData.isEmergency ? 'EMERGENCY CALL' : 'Video Consultation'}
            </Text>
          </View>
        </View>

        <View style={styles.callerInfo}>
          <Animated.View 
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: callData.callerImage || PLACEHOLDER_IMAGE }}
                style={styles.callerImage}
              />
            </View>
          </Animated.View>

          <Text style={styles.callerName}>
            {callData.callerName}
          </Text>

          <Text style={styles.callerMessage}>
            {callData.isEmergency 
              ? 'is requesting an emergency consultation' 
              : 'is calling you for a video consultation'
            }
          </Text>

          <View style={styles.connectionIndicator}>
            <View style={[styles.connectionDot, { backgroundColor: joining ? COLORS.warning : COLORS.success }]} />
            <Text style={styles.connectionText}>
              {statusMessage}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={styles.declineButton}
            onPress={handleReject}
            disabled={joining || rejecting}
          >
            <View style={[styles.iconCircle, { backgroundColor: COLORS.error }]}>
              {rejecting ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Feather name="x" size={36} color="#fff" />
              )}
            </View>
            <Text style={styles.buttonLabel}>
              {rejecting ? 'Declining...' : 'Decline'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.acceptButton}
            onPress={handleAccept}
            disabled={joining || rejecting}
          >
            <Animated.View
              style={[
                styles.glowCircle,
                {
                  shadowRadius: glowInterpolate,
                  shadowOpacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                }
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: COLORS.success }]}>
                {joining ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Feather name="phone" size={36} color="#fff" />
                )}
              </View>
            </Animated.View>
            <Text style={styles.buttonLabel}>
              {joining ? 'Joining...' : 'Accept'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Feather name="info" size={16} color="#fff" style={{ opacity: 0.7 }} />
          <Text style={styles.footerText}>
            {callData.isEmergency
              ? 'This is an urgent consultation request. Please respond promptly.'
              : 'Make sure you are in a quiet place with good internet connection.'}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  callerInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarRing: {
    padding: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  callerImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: '#fff',
  },
  callerName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 24,
  },
  callerMessage: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 12,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
  },
  declineButton: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  acceptButton: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  glowCircle: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  footerText: {
    color: '#fff',
    marginLeft: 8,
    opacity: 0.7,
    fontSize: 13,
    textAlign: 'center',
    flex: 1,
  },
});