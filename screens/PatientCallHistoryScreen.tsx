import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { professionalService, Booking, Prescription } from '../services/professionalService';
import { RatingModal } from '../components/ConsultationModal';
import i18n from '../lib/i18n';

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

export default function PatientCallHistoryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [callHistory, setCallHistory] = useState<Booking[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Booking | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'emergency'>('all');

  // Prescription view states
  const [prescriptionData, setPrescriptionData] = useState<Prescription | null>(null);
  const [showPrescriptionView, setShowPrescriptionView] = useState(false);

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
      const history = await professionalService.getCallHistory(user.uid, 'patient');
      setCallHistory(history);
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

    if (filter === 'emergency') {
      filtered = filtered.filter(call => call.isEmergency);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(call =>
        call.professionalName?.toLowerCase().includes(query) ||
        call.reason?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCallHistory();
  };

  const handleRateConsultation = async (call: Booking) => {
    try {
      const professional = await professionalService.getProfessional(call.professionalId);
      if (professional) {
        setSelectedCall(call);
        setShowRating(true);
      }
    } catch (error) {
      Alert.alert(i18n.t('error'), 'Failed to load professional details');
    }
  };

  const handleViewPrescription = async (call: Booking) => {
    if (!call.prescriptionId) return;

    setSelectedCall(call);
    try {
      const prescription = await professionalService.getPrescription(call.prescriptionId);
      if (prescription) {
        setPrescriptionData(prescription);
        setShowPrescriptionView(true);
      } else {
        Alert.alert(i18n.t('error'), 'Prescription not found.');
      }
    } catch (error) {
      console.error('Error fetching prescription:', error);
      Alert.alert(i18n.t('error'), 'Failed to load prescription.');
    }
  };

  const handleGeneratePDF = () => {
    if (!prescriptionData || !selectedCall) return;

    Alert.alert(
      'Generate PDF',
      `This would generate a printable PDF of the prescription from Dr. ${selectedCall.professionalName}.\n\n` +
      `Medications: ${prescriptionData.medications}\n` +
      `Dosage: ${prescriptionData.dosage}\n` +
      `Instructions: ${prescriptionData.instructions}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download PDF (Simulated)',
          onPress: () => {
            Alert.alert('Success', 'PDF generated and saved (simulated)!');
            setShowPrescriptionView(false);
          },
        },
      ]
    );
  };

  const renderCallCard = ({ item }: { item: Booking }) => {
    const callDate = new Date(item.callEndedAt ?? item.createdAt);
    const duration = item.callStartedAt && item.callEndedAt
      ? Math.floor((item.callEndedAt - item.callStartedAt) / 60000)
      : 0;

    const hasPrescription = !!item.prescriptionId;

    return (
      <Pressable
        style={[
          styles.callCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: item.isEmergency ? theme.error : theme.border,
            borderWidth: item.isEmergency ? 2 : 1,
          },
        ]}
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
            <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.avatar} />
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText weight="medium" style={{ fontSize: 16 }}>
              {item.professionalName}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Feather name="calendar" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {callDate.toLocaleDateString()} at {callDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

          <View style={[styles.feeTag, { backgroundColor: theme.error + '20' }]}>
            <ThemedText weight="medium" style={{ color: theme.error }}>
              -₦{item.fee.toLocaleString()}
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
          {hasPrescription && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
              onPress={() => handleViewPrescription(item)}
            >
              <Feather name="file-text" size={16} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 8 }}>
                View Prescription
              </ThemedText>
            </Pressable>
          )}

          {!item.rated && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => handleRateConsultation(item)}
            >
              <Feather name="star" size={16} color="#fff" />
              <ThemedText lightColor="#fff" type="caption" style={{ marginLeft: 8 }}>
                Rate Consultation
              </ThemedText>
            </Pressable>
          )}

          {item.rated && (
            <View style={[styles.actionButton, { backgroundColor: theme.success + '20' }]}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, marginLeft: 8 }}>
                Rated
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <ThemedText type="h2">My Call History</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {filteredHistory.length} completed consultations
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by doctor or reason..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'emergency'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === f ? theme.primary : theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              weight="medium"
              lightColor={filter === f ? '#fff' : theme.text}
              style={{ fontSize: 13 }}
            >
              {f === 'all' ? 'All Consultations' : 'Emergency Only'}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderCallCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="phone-off" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: 16, color: theme.textSecondary }}>
              No consultations yet
            </ThemedText>
            <ThemedText style={{ marginTop: 8, color: theme.textSecondary, textAlign: 'center' }}>
              Your completed video consultations will appear here
            </ThemedText>
          </View>
        }
      />

      {/* Rating Modal */}
      {showRating && selectedCall && (
        <RatingModal
          professional={{
            uid: selectedCall.professionalId,
            name: selectedCall.professionalName,
            email: '',
            role: 'professional',
            professionalType: 'doctor',
          } as any}
          booking={selectedCall}
          onClose={() => {
            setShowRating(false);
            setSelectedCall(null);
            loadCallHistory();
          }}
        />
      )}

      {/* Prescription View Modal */}
      {showPrescriptionView && prescriptionData && selectedCall && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowPrescriptionView(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" lightColor="#fff">
                  Prescription
                </ThemedText>
                <Pressable onPress={() => setShowPrescriptionView(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <ThemedText weight="medium" style={{ marginBottom: 16 }}>
                  From: Dr. {selectedCall.professionalName}
                </ThemedText>

                <ThemedText weight="bold" style={styles.sectionTitle}>Medications</ThemedText>
                <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText>{prescriptionData.medications}</ThemedText>
                </View>

                <ThemedText weight="bold" style={styles.sectionTitle}>Dosage</ThemedText>
                <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText>{prescriptionData.dosage}</ThemedText>
                </View>

                <ThemedText weight="bold" style={styles.sectionTitle}>Duration</ThemedText>
                <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText>{prescriptionData.duration || 'Not specified'}</ThemedText>
                </View>

                <ThemedText weight="bold" style={styles.sectionTitle}>Instructions</ThemedText>
                <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText>{prescriptionData.instructions}</ThemedText>
                </View>

                {prescriptionData.notes && (
                  <>
                    <ThemedText weight="bold" style={styles.sectionTitle}>Additional Notes</ThemedText>
                    <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <ThemedText>{prescriptionData.notes}</ThemedText>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <PrimaryButton title="Generate Printable PDF" onPress={handleGeneratePDF} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1,},
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
    marginHorizontal: 16,
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },

  // Modal
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
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 15,
  },
  sectionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});