import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Spacing, BorderRadius } from '../constants/theme';
import { professionalService, Booking } from '../services/professionalService'; // Assuming Booking now includes prescriptionId
import i18n from '../lib/i18n';

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=User";

interface PrescriptionData {
  medications: string;
  dosage: string;
  duration: string;
  instructions: string;
  notes?: string;
}

export default function CallHistoryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [callHistory, setCallHistory] = useState<Booking[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Booking | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({
    medications: '',
    dosage: '',
    duration: '',
    instructions: '',
    notes: '',
  });
  const [filter, setFilter] = useState<'all' | 'completed' | 'emergency'>('all');

  useEffect(() => {
    loadCallHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [callHistory, searchQuery, filter]);

  const loadCallHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const bookings = await professionalService.getProfessionalBookings(user.uid);
      
      // Only show completed consultations
      const completedCalls = bookings.filter(b => b.status === 'completed');
      
      setCallHistory(completedCalls);
    } catch (error) {
      console.error('Error loading call history:', error);
      Alert.alert(i18n.t('error'), 'Failed to load call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterHistory = () => {
    let filtered = [...callHistory];

    // Apply filter
    if (filter === 'emergency') {
      filtered = filtered.filter(call => call.isEmergency);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call =>
        call.patientName.toLowerCase().includes(query) ||
        call.reason?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCallHistory();
  };

  const handleViewDetails = (call: Booking) => {
    setSelectedCall(call);
  };

  const handleSendPrescription = async (call: Booking) => {
    setSelectedCall(call);
    
    if (call.prescriptionId) {
      // Load existing prescription data for editing
      try {
        const existing = await professionalService.getPrescription(call.prescriptionId);
        if (existing) {
          setPrescriptionData({
            medications: existing.medications,
            dosage: existing.dosage,
            duration: existing.duration,
            instructions: existing.instructions,
            notes: existing.notes,
          });
        }
      } catch (error) {
        console.error('Error loading existing prescription:', error);
        // Fallback to empty data if loading fails
      }
    } else {
      // Clear data for new prescription
      setPrescriptionData({
        medications: '',
        dosage: '',
        duration: '',
        instructions: '',
        notes: '',
      });
    }

    setShowPrescriptionModal(true);
  };

  const submitPrescription = async () => {
    if (!selectedCall || !user) return;

    // Validate required fields
    if (!prescriptionData.medications.trim() || 
        !prescriptionData.dosage.trim() || 
        !prescriptionData.instructions.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields (Medications, Dosage, Instructions)');
      return;
    }

    try {
      // 🌟 FIX: Call the new service function to save the prescription
      await professionalService.savePrescription(
        selectedCall.id,
        user.uid,
        prescriptionData,
        selectedCall.patientId
      );
      
      Alert.alert(
        selectedCall.prescriptionId ? 'Prescription Updated' : 'Prescription Sent',
        `Prescription ${selectedCall.prescriptionId ? 'updated' : 'sent'} to ${selectedCall.patientName} successfully`,
        [{ 
          text: 'OK', 
          onPress: () => {
            setShowPrescriptionModal(false);
            loadCallHistory(); // Reload history to update the card status
          } 
        }]
      );
    } catch (error) {
      console.error('Error submitting prescription:', error);
      Alert.alert('Error', 'Failed to send prescription. Please try again.');
    }
  };

  const renderCallCard = ({ item }: { item: Booking }) => {
    const callDate = new Date(item.createdAt);
    const duration = item.callStartedAt 
      ? Math.floor((Date.now() - item.callStartedAt) / 60000)
      : 0;

    const hasPrescription = !!item.prescriptionId;

    return (
      <Pressable
        style={[styles.callCard, { 
          backgroundColor: theme.cardBackground,
          borderColor: item.isEmergency ? theme.error : theme.border,
          borderWidth: item.isEmergency ? 2 : 1,
        }]}
        onPress={() => handleViewDetails(item)}
      >
        {item.isEmergency && (
          <View style={[styles.emergencyBadge, { backgroundColor: theme.error }]}>
            <Feather name="zap" size={12} color="#fff" />
            <ThemedText lightColor="#fff" style={{ fontSize: 10, fontWeight: 'bold' }}>
              EMERGENCY
            </ThemedText>
          </View>
        )}

        <View style={styles.callHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: PLACEHOLDER_IMAGE }} 
              style={styles.avatar}
            />
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText weight="medium" style={{ fontSize: 16 }}>
              {item.patientName}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Feather name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {callDate.toLocaleDateString()} at {callDate.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </ThemedText>
            </View>
            {duration > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Feather name="clock" size={12} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {duration} minutes
                </ThemedText>
              </View>
            )}
          </View>

          <View style={[styles.feeTag, { backgroundColor: theme.success + '20' }]}>
            <ThemedText weight="medium" style={{ color: theme.success }}>
              ₦{item.fee.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        {item.reason && (
          <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" numberOfLines={2}>
              {item.reason}
            </ThemedText>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => handleViewDetails(item)}
          >
            <Feather name="eye" size={16} color={theme.text} />
            <ThemedText type="caption">View Details</ThemedText>
          </Pressable>
          
          <Pressable
            style={[
              styles.actionButton,
              { 
                backgroundColor: hasPrescription ? theme.success + '20' : theme.primary + '20',
              }
            ]}
            onPress={() => handleSendPrescription(item)}
          >
            <Feather 
              name={hasPrescription ? "file-text" : "edit-3"} 
              size={16} 
              color={hasPrescription ? theme.success : theme.primary} 
            />
            <ThemedText 
              type="caption" 
              style={{ color: hasPrescription ? theme.success : theme.primary }}
            >
              {hasPrescription ? 'Edit Prescription' : 'Prescription'}
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h2">Call History</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {filteredHistory.length} completed consultations
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { 
        backgroundColor: theme.backgroundSecondary,
        borderColor: theme.border,
      }]}>
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by patient name..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        {(['all', 'emergency'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === f ? theme.primary : theme.cardBackground,
                borderColor: theme.border,
              }
            ]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              weight="medium"
              lightColor={filter === f ? '#fff' : theme.text}
              style={{ fontSize: 13 }}
            >
              {f === 'all' ? 'All Calls' : 'Emergency Only'}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Call History List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="phone-off" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: 16, color: theme.textSecondary }}>
              No call history yet
            </ThemedText>
            <ThemedText style={{ marginTop: 8, color: theme.textSecondary, textAlign: 'center' }}>
              Completed consultations will appear here
            </ThemedText>
          </View>
        }
      />

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedCall && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" lightColor="#fff">
                  {selectedCall.prescriptionId ? 'Edit Prescription' : 'Send Prescription'}
                </ThemedText>
                <Pressable onPress={() => setShowPrescriptionModal(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <ThemedText weight="medium" style={{ marginBottom: 12 }}>
                  Patient: {selectedCall.patientName}
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText weight="medium">Medications *</ThemedText>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="List medications..."
                    placeholderTextColor={theme.textSecondary}
                    value={prescriptionData.medications}
                    onChangeText={(text) => setPrescriptionData({ ...prescriptionData, medications: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText weight="medium">Dosage *</ThemedText>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="e.g., 500mg twice daily"
                    placeholderTextColor={theme.textSecondary}
                    value={prescriptionData.dosage}
                    onChangeText={(text) => setPrescriptionData({ ...prescriptionData, dosage: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText weight="medium">Duration</ThemedText>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="e.g., 7 days"
                    placeholderTextColor={theme.textSecondary}
                    value={prescriptionData.duration}
                    onChangeText={(text) => setPrescriptionData({ ...prescriptionData, duration: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText weight="medium">Instructions *</ThemedText>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="Special instructions for patient..."
                    placeholderTextColor={theme.textSecondary}
                    value={prescriptionData.instructions}
                    onChangeText={(text) => setPrescriptionData({ ...prescriptionData, instructions: text })}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText weight="medium">Additional Notes</ThemedText>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    }]}
                    placeholder="Optional notes..."
                    placeholderTextColor={theme.textSecondary}
                    value={prescriptionData.notes}
                    onChangeText={(text) => setPrescriptionData({ ...prescriptionData, notes: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <PrimaryButton
                  title="Cancel"
                  onPress={() => setShowPrescriptionModal(false)}
                  variant="outlined"
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title={selectedCall.prescriptionId ? 'Save Changes' : 'Send Prescription'}
                  onPress={submitPrescription}
                  style={{ flex: 1, marginLeft: 12 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  listContent: {
    padding: 16,
  },
  callCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
  },
  emergencyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  feeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reasonBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
  },
});