// screens/VideoCallTestScreen.tsx - UPDATED WITH CORRECT CALL TYPE
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Spacing, BorderRadius } from '../constants/theme';
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  CallControls,
  CallContent,
} from '@stream-io/video-react-native-sdk';
import { 
  initStreamClient, 
  createVideoCall, 
  checkBackendHealth,
  joinVideoCall // ✅ Import the new function
} from '../services/streamService';
import { firebaseService, User } from '../services/firebaseService';
import { notificationService } from '../services/notificationService';

export default function VideoCallTestScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const TEST_BOOKING_ID = `test_booking_${Date.now()}`;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allUsers.filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await firebaseService.getAllUsers();
      const otherUsers = users.filter(u => u.uid !== user?.uid);
      setAllUsers(otherUsers);
      setFilteredUsers(otherUsers);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load users: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCheckBackend = async () => {
    setLoading(true);
    setTestStatus('Checking backend health...');
    
    try {
      const isHealthy = await checkBackendHealth();
      
      if (isHealthy) {
        setTestStatus('✅ Backend is healthy and responding!');
        Alert.alert('Success', 'Backend server is working correctly!');
      } else {
        setTestStatus('❌ Backend is not responding');
        Alert.alert('Error', 'Backend server is not responding. Check if it\'s running.');
      }
    } catch (error: any) {
      setTestStatus(`❌ Backend check failed: ${error.message}`);
      Alert.alert('Error', `Backend check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeClient = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to test video calls');
      return;
    }

    setLoading(true);
    setTestStatus('Initializing Stream client...');

    try {
      const streamClient = await initStreamClient(
        user.uid,
        user.name || 'Test User',
        user.imageUrl
      );
      
      setClient(streamClient);
      setTestStatus('✅ Stream client initialized successfully!');
      Alert.alert('Success', 'Stream client is ready! Now select a user to call.');
    } catch (error: any) {
      setTestStatus(`❌ Client initialization failed: ${error.message}`);
      Alert.alert('Error', `Failed to initialize client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTestCall = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    if (!client) {
      Alert.alert('Error', 'Please initialize the client first');
      return;
    }

    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to call');
      return;
    }

    setLoading(true);
    setTestStatus('Creating test video call...');

    try {
      console.log('🎥 Creating call with params:', {
        bookingId: TEST_BOOKING_ID,
        professionalId: selectedUser.uid,
        patientId: user.uid,
        professionalName: selectedUser.name,
        patientName: user.name
      });

      // Create the call via backend
      const { callId } = await createVideoCall(
        TEST_BOOKING_ID,
        selectedUser.uid,
        user.uid,
        selectedUser.name || 'Test User',
        user.name || 'Patient'
      );

      console.log('✅ Call created with ID:', callId);

      // ✅ FIX 1: Send incoming call notification to the recipient
      await notificationService.sendIncomingCallNotification({
        callId,
        bookingId: TEST_BOOKING_ID,
        callerName: user.name || 'User',
        callerImage: user.imageUrl,
        callerId: user.uid,
        receiverId: selectedUser.uid, // The user being called
        createdAt: Date.now(),
        isEmergency: false,
      });

      setTestStatus(`✅ Call created & notification sent! Waiting for ${selectedUser.name} to join...`);

      // ⚠️ IMPORTANT: We no longer immediately join and setCall here in the test flow
      // The user initiating the call should be taken to a "Connecting/Waiting" screen.
      // For this test, we now proceed to join the call immediately for simplicity, 
      // but in a real app, you'd use newCall.get() and wait for the other user.
      
      // Joining the call for the initiator to simulate the start
      console.log('🔌 Initiator Joining call...');
      const newCall = await joinVideoCall(client, callId);
      await newCall.get(); // Fetch call data for a better state

      console.log('✅ Initiator successfully joined call');
      setCall(newCall);
      setTestStatus('✅ Initiator successfully joined the call!');
      setLoading(false);

      

    } catch (error: any) {
      console.error('❌ Call creation/join error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      
      setTestStatus(`❌ Call failed: ${error.message}`);
      
      Alert.alert(
        'Call Failed', 
        `${error.message}\n\nCheck console for full error details.`,
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!call || !client) return;

    try {
      await call.leave();
      await client.disconnectUser();
      setCall(null);
      setClient(null);
      setTestStatus('Call ended successfully');
      Alert.alert('Success', 'Call ended successfully!');
    } catch (error: any) {
      Alert.alert('Error', `Failed to end call: ${error.message}`);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'professional': return theme.primary;
      case 'admin': return theme.error;
      case 'seller': return theme.warning;
      case 'buyer': return theme.success;
      default: return theme.textSecondary;
    }
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Feather name="video" size={48} color="#fff" />
          <ThemedText type="h2" lightColor="#fff" style={{ marginTop: Spacing.md }}>
            Video Call Test
          </ThemedText>
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.sm, opacity: 0.9 }}>
            Test your Stream video integration
          </ThemedText>
        </View>

        {/* User Info */}
        {user && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={20} color={theme.primary} />
              <ThemedText weight="medium" style={{ marginLeft: Spacing.sm }}>
                Your Info
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="caption">Name:</ThemedText>
              <ThemedText>{user.name || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="caption">Role:</ThemedText>
              <ThemedText>{user.role}</ThemedText>
            </View>
          </View>
        )}

        {/* Selected User Info */}
        {selectedUser && (
          <View style={[styles.card, { backgroundColor: theme.success + '15', borderColor: theme.success }]}>
            <View style={styles.cardHeader}>
              <Feather name="phone-call" size={20} color={theme.success} />
              <ThemedText weight="medium" style={{ marginLeft: Spacing.sm, color: theme.success }}>
                Selected User to Call
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="caption">Name:</ThemedText>
              <ThemedText weight="medium">{selectedUser.name}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="caption">Email:</ThemedText>
              <ThemedText type="caption">{selectedUser.email}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="caption">Role:</ThemedText>
              <ThemedText style={{ color: getRoleColor(selectedUser.role) }}>
                {selectedUser.role}
              </ThemedText>
            </View>
            
            <PrimaryButton
              title="Change User"
              onPress={() => setShowUserPicker(true)}
              variant="outlined"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}

        {/* Test Status */}
        {testStatus !== '' && (
          <View style={[styles.card, { 
            backgroundColor: testStatus.includes('❌') ? theme.error + '15' : theme.success + '15',
            borderColor: testStatus.includes('❌') ? theme.error : theme.success
          }]}>
            <View style={styles.cardHeader}>
              <Feather 
                name={testStatus.includes('❌') ? 'x-circle' : 'check-circle'} 
                size={20} 
                color={testStatus.includes('❌') ? theme.error : theme.success} 
              />
              <ThemedText weight="medium" style={{ marginLeft: Spacing.sm }}>
                Status
              </ThemedText>
            </View>
            <ThemedText style={{ marginTop: Spacing.sm }}>{testStatus}</ThemedText>
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.card, { backgroundColor: theme.info + '15', borderColor: theme.info }]}>
          <View style={styles.cardHeader}>
            <Feather name="info" size={20} color={theme.info} />
            <ThemedText weight="medium" style={{ marginLeft: Spacing.sm, color: theme.info }}>
              Test Instructions
            </ThemedText>
          </View>
          <ThemedText style={{ marginTop: Spacing.sm, lineHeight: 20 }}>
            1. Check if your backend server is running{'\n'}
            2. Initialize the Stream client{'\n'}
            3. Select a user from your app to call{'\n'}
            4. Start the test call{'\n'}
            5. End the call when done
          </ThemedText>
        </View>

        {/* Test Buttons */}
        <View style={styles.buttonsContainer}>
          <PrimaryButton
            title="1. Check Backend Health"
            onPress={handleCheckBackend}
            disabled={loading}
            style={{ marginBottom: Spacing.md }}
            icon={<Feather name="server" size={20} color="#fff" />}
          />

          <PrimaryButton
            title="2. Initialize Stream Client"
            onPress={handleInitializeClient}
            disabled={loading || !user || !!client}
            variant={client ? "outlined" : "primary"}
            style={{ marginBottom: Spacing.md }}
            icon={<Feather name="play-circle" size={20} color={client ? theme.primary : "#fff"} />}
          />

          <PrimaryButton
            title="3. Select User to Call"
            onPress={() => setShowUserPicker(true)}
            disabled={loading || !client}
            variant={selectedUser ? "outlined" : "primary"}
            style={{ marginBottom: Spacing.md }}
            icon={<Feather name="users" size={20} color={selectedUser ? theme.primary : "#fff"} />}
          />

          <PrimaryButton
            title="4. Start Test Call"
            onPress={handleStartTestCall}
            disabled={loading || !client || !selectedUser}
            style={{ marginBottom: Spacing.md }}
            icon={<Feather name="video" size={20} color="#fff" />}
          />

          {(client || call) && (
            <PrimaryButton
              title="Reset Test"
              onPress={() => {
                setClient(null);
                setCall(null);
                setSelectedUser(null);
                setTestStatus('');
              }}
              variant="outlined"
              style={{ marginTop: Spacing.lg }}
              icon={<Feather name="refresh-cw" size={20} color={theme.primary} />}
            />
          )}
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
              Processing...
            </ThemedText>
          </View>
        )}

        {/* Backend Info */}
        <View style={[styles.card, { backgroundColor: theme.warning + '15', borderColor: theme.warning }]}>
          <View style={styles.cardHeader}>
            <Feather name="alert-triangle" size={20} color={theme.warning} />
            <ThemedText weight="medium" style={{ marginLeft: Spacing.sm, color: theme.warning }}>
              Important Notes
            </ThemedText>
          </View>
          <ThemedText style={{ marginTop: Spacing.sm, lineHeight: 20 }}>
            • Backend URL: {'\n'}https://bubustream-b5o7.onrender.com{'\n\n'}
            • Using 'default' call type{'\n\n'}
            • Select any user to test calling them{'\n\n'}
            • Both users need to join for full video
          </ThemedText>
        </View>
      </View>

      {/* User Picker Modal */}
      <Modal visible={showUserPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" lightColor="#fff">Select User to Call</ThemedText>
              <Pressable onPress={() => setShowUserPicker(false)}>
                <Feather name="x" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search by name, email, or role..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.usersList}>
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <ThemedText style={{ marginTop: Spacing.md }}>Loading users...</ThemedText>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="users" size={48} color={theme.textSecondary} />
                  <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                    {searchQuery ? 'No users found' : 'No other users available'}
                  </ThemedText>
                </View>
              ) : (
                filteredUsers.map((u) => (
                  <Pressable
                    key={u.uid}
                    style={[
                      styles.userCard,
                      { 
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: selectedUser?.uid === u.uid ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => {
                      setSelectedUser(u);
                      setShowUserPicker(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
                        <ThemedText weight="medium">{u.name || 'Unnamed User'}</ThemedText>
                        {selectedUser?.uid === u.uid && (
                          <Feather name="check-circle" size={16} color={theme.primary} style={{ marginLeft: Spacing.xs }} />
                        )}
                      </View>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {u.email}
                      </ThemedText>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(u.role) + '20' }]}>
                        <ThemedText type="caption" style={{ color: getRoleColor(u.role) }}>
                          {u.role}
                        </ThemedText>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                  </Pressable>
                ))
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <PrimaryButton
                title="Cancel"
                onPress={() => {
                  setShowUserPicker(false);
                  setSearchQuery('');
                }}
                variant="outlined"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: 100 },
  header: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  buttonsContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    margin: Spacing.md,
    backgroundColor: '#f0f0f0',
    borderRadius: BorderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  usersList: {
    flex: 1,
    padding: Spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing["3xl"],
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});