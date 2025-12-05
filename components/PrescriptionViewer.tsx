// components/PrescriptionViewer.tsx
import { View, StyleSheet, Image, Pressable, Modal, Linking } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

interface PrescriptionViewerProps {
  prescriptionUrl: string;
  prescriptionFileName: string;
  productName: string;
}

export function PrescriptionViewer({ 
  prescriptionUrl, 
  prescriptionFileName,
  productName 
}: PrescriptionViewerProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  
  const isPDF = prescriptionFileName.toLowerCase().endsWith('.pdf');

  const handleViewPrescription = () => {
    if (isPDF) {
      // Open PDF in browser/external app
      Linking.openURL(prescriptionUrl);
    } else {
      // Show image in modal
      setShowModal(true);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={styles.iconContainer}>
          <Feather name="file-text" size={24} color={theme.primary} />
        </View>
        
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Prescription for {productName}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {prescriptionFileName}
          </ThemedText>
        </View>

        <Pressable
          style={[styles.viewButton, { backgroundColor: theme.primary }]}
          onPress={handleViewPrescription}
        >
          <Feather name="eye" size={16} color="#fff" />
          <ThemedText style={{ marginLeft: 4, color: "#fff", fontSize: 12 }}>
            View
          </ThemedText>
        </Pressable>
      </View>

      {/* Image Preview Modal */}
      {!isPDF && (
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Feather name="x" size={24} color="#fff" />
              </Pressable>

              <Image
                source={{ uri: prescriptionUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />

              <View style={styles.modalFooter}>
                <ThemedText style={{ color: "#fff", textAlign: "center" }}>
                  {prescriptionFileName}
                </ThemedText>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullImage: {
    width: "90%",
    height: "70%",
  },
  modalFooter: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
});