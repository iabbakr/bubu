// components/IncomingCallModal.tsx - FULL-SCREEN INCOMING CALL UI
import React, { useState, useEffect } from 'react';
import { View, Modal, Image, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Spacing, BorderRadius } from '../constants/theme';
import { IncomingCallData, notificationService } from '../services/notificationService';
import { initStreamClient, joinVideoCall } from '../services/streamService';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import {
  StreamVideo,
  StreamCall,
  CallControls,
  CallContent,
} from '@stream-io/video-react-native-sdk';
import { useAuth } from '../hooks/useAuth';

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

export const IncomingCallModal = ({
  callData,
  onAccept,
  onReject,
}: {
  callData: IncomingCallData;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pulseAnim] = useState(new Animated.Value(1));
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  // Pulsing animation for the call button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
    return () => pulse.stop();
  }, []);

  const handleAccept = async () => {
    if (!user) return;
    
    setJoining(true);
    try {
      console.log('📞 Accepting call:', callData.callId);
      
      // Initialize Stream client
      const streamClient = await initStreamClient(
        user.uid,
        user.name || 'User',
        user.imageUrl
      );
      setClient(streamClient);

      // Join the existing call
      console.log('🔌 Joining existing call...');
      const existingCall = await joinVideoCall(streamClient, callData.callId);
      setCall(existingCall);

      // Clear incoming call notification
      await notificationService.clearIncomingCall(user.uid);
      
      console.log('✅ Successfully joined call');
      onAccept();
    } catch (error: any) {
      console.error('❌ Failed to join call:', error);
      alert(`Failed to join call: ${error.message}`);
      setJoining(false);
    }
  };

  const handleReject = async () => {
    if (!user) return;
    
    try {
      // Clear incoming call notification
      await notificationService.clearIncomingCall(user.uid);
      onReject();
    } catch (error) {
      console.error('Error rejecting call:', error);
      onReject();
    }
  };

  const handleEndCall = async () => {
    if (call && client) {
      try {
        await call.leave();
        await client.disconnectUser();
        await notificationService.clearIncomingCall(user!.uid);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    onReject();
  };

  // If in active call, show call UI
  if (call && client) {
    return (
      <Modal visible animationType="fade">
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              <CallContent style={{ flex: 1 }} />
              <CallControls onHangupCallHandler={handleEndCall} />
            </View>
          </StreamCall>
        </StreamVideo>
      </Modal>
    );
  }

  // Incoming call UI
  return (
    <Modal visible animationType="fade">
      <View style={[styles.container, { backgroundColor: callData.isEmergency ? theme.error : theme.primary }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h3" lightColor="#fff" style={{ opacity: 0.9 }}>
            {callData.isEmergency ? '🚨 EMERGENCY CALL' : 'Incoming Video Call'}
          </ThemedText>
        </View>

        {/* Caller Info */}
        <View style={styles.callerInfo}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image
              source={{ uri: callData.callerImage || PLACEHOLDER_IMAGE }}
              style={styles.callerImage}
            />
          </Animated.View>
          
          <ThemedText type="h1" lightColor="#fff" style={{ marginTop: Spacing.xl }}>
            {callData.callerName}
          </ThemedText>
          
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.md, fontSize: 18, opacity: 0.9 }}>
            wants to start a video consultation
          </ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Reject Button */}
          <Pressable
            style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
            onPress={handleReject}
            disabled={joining}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.error }]}>
              <Feather name="phone-off" size={32} color="#fff" />
            </View>
            <ThemedText lightColor="#fff" style={{ marginTop: Spacing.sm }}>
              Decline
            </ThemedText>
          </Pressable>

          {/* Accept Button */}
          <Pressable
            style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
            onPress={handleAccept}
            disabled={joining}
          >
            <Animated.View style={[
              styles.iconCircle,
              { backgroundColor: theme.success, transform: [{ scale: pulseAnim }] }
            ]}>
              <Feather name="video" size={32} color="#fff" />
            </Animated.View>
            <ThemedText lightColor="#fff" style={{ marginTop: Spacing.sm }}>
              {joining ? 'Joining...' : 'Accept'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Additional Info */}
        <View style={styles.footer}>
          <Feather name="info" size={16} color="#fff" style={{ opacity: 0.7 }} />
          <ThemedText lightColor="#fff" style={{ marginLeft: Spacing.xs, opacity: 0.7, fontSize: 12 }}>
            {callData.isEmergency 
              ? 'This is an urgent consultation request'
              : 'Make sure you are in a quiet place with good internet'}
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  callerInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  callerImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing["3xl"],
  },
  actionButton: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
});