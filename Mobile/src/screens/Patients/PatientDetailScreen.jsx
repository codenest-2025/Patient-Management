import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, ActivityIndicator, Alert } from "react-native";
import { Text, Card, List, Button, Avatar, Divider, Portal, Modal, TextInput, HelperText, Surface, IconButton } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";

export default function PatientDetailScreen({ route, navigation }) {
  const { patientId } = route.params;
  const { userInfo } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Ref to track if we are actively deleting this patient to prevent socket races
  const isDeleting = useRef(false);

  // Payment Modal State
  const [visible, setVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const fetchPatientData = async () => {
    try {
      // Parallel fetch — both requests fire at the same time
      const [pRes, vRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get("/visits", { params: { patientId } }),
      ]);
      setPatient(pRes.data);
      // Backend already sorts by visitDate desc — no client-side sort needed
      setVisits(vRes.data.visits || []);
    } catch (e) {
      console.error(e);
      if (e.response?.status === 404 && !isDeleting.current) {
        Alert.alert(
          "Patient Deleted",
          "This patient record has been deleted by an administrator.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("Patient Detail Screen focused, refreshing data...");
      fetchPatientData();
    });
    return unsubscribe;
  }, [navigation, patientId]);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        if (isDeleting.current) return;
        if (navigation.isFocused()) {
          console.log("Real-time update received on Patient Detail");
          fetchPatientData();
        }
      };

      socket.on("patient_changed", handler);
      socket.on("visit_added", handler);

      return () => {
        socket.off("patient_changed", handler);
        socket.off("visit_added", handler);
      };
    }
  }, [socket, patientId, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatientData();
  }, [patientId]);

  const handleClearDue = async () => {
    if (!paymentAmount || isNaN(paymentAmount)) return;
    
    setPaying(true);
    try {
      await api.post("/payments/clear-due", {
        patientId,
        amountPaid: parseFloat(paymentAmount),
        notes
      });
      setVisible(false);
      setPaymentAmount("");
      setNotes("");
      fetchPatientData();
    } catch (e) {
      console.error(e);
    } finally {
      setPaying(false);
    }
  };

  const handleDeleteVisit = (visitId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this visit history? This will automatically restore medicine stocks and adjust the patient's outstanding balance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/visits/${visitId}`);
              Alert.alert("Success", "Visit deleted successfully");
              fetchPatientData();
            } catch (e) {
              console.error(e);
              Alert.alert("Error", e.response?.data?.message || "Failed to delete visit");
            }
          }
        }
      ]
    );
  };

  const handleDeletePatient = () => {
    if (visits && visits.length > 0) {
      Alert.alert(
        "Cannot Delete",
        "This patient has existing visit history and cannot be deleted. You must delete all visit history first."
      );
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this patient record? This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              isDeleting.current = true;
              await api.delete(`/patients/${patientId}`);
              Alert.alert("Success", "Patient deleted successfully");
              navigation.goBack();
            } catch (e) {
              isDeleting.current = false;
              console.error(e);
              Alert.alert("Error", e.response?.data?.message || "Failed to delete patient");
            }
          }
        }
      ]
    );
  };

  // Show a non-blocking spinner until the first load completes
  if (loading && !patient) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004d40" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={["#004d40", "#00695c"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Avatar.Text 
              size={80} 
              label={patient.name.substring(0, 1).toUpperCase()} 
              backgroundColor="rgba(255,255,255,0.2)" 
              color="white"
            />
            <View style={styles.headerText}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="headlineSmall" style={[styles.patientName, { flex: 1 }]} numberOfLines={1}>{patient.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <IconButton 
                    icon="pencil-outline" 
                    iconColor="white" 
                    size={20} 
                    onPress={() => navigation.navigate("EditPatient", { patientId })}
                    containerColor="rgba(255,255,255,0.15)"
                    style={{ marginRight: 5, margin: 0 }}
                  />
                  {userInfo?.role === "admin" && (
                    <IconButton 
                      icon="delete-outline" 
                      iconColor="#ffcdd2" 
                      size={20} 
                      onPress={handleDeletePatient}
                      containerColor="rgba(244,67,54,0.3)"
                      style={{ margin: 0 }}
                    />
                  )}
                </View>
              </View>
              <View style={styles.contactRow}>
                <IconButton icon="phone" size={16} iconColor="rgba(255,255,255,0.7)" />
                <Text style={styles.headerSubtext}>{patient.mobile1 || "No mobile number"}</Text>
              </View>
              <View style={styles.contactRow}>
                <IconButton icon="map-marker" size={16} iconColor="rgba(255,255,255,0.7)" />
                <Text style={styles.headerSubtext} numberOfLines={1}>{patient.address || "No address"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <Surface style={styles.dueSurface} elevation={3}>
           <View style={styles.dueHeader}>
              <Text variant="labelLarge" style={styles.dueLabel}>TOTAL OUTSTANDING</Text>
              <Text variant="headlineMedium" style={[styles.dueAmount, { color: patient.totalDue > 0 ? "#f44336" : "#4caf50" }]}>
                ₹{patient.totalDue}
              </Text>
           </View>
           <View style={styles.actionRow}>
              <Button 
                mode="contained" 
                onPress={() => setVisible(true)}
                disabled={patient.totalDue <= 0}
                style={styles.payButton}
                icon="cash-check"
              >
                Clear Due
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate("CreateVisit", { patientId })}
                style={styles.visitButton}
                icon="plus"
                textColor="#004d40"
              >
                New Visit
              </Button>
           </View>
        </Surface>

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Visit History</Text>
        </View>

        {visits.length > 0 ? (
          visits.map((visit) => (
            <Surface key={visit._id} style={styles.listItem} elevation={1}>
              <List.Item
                title={new Date(visit.visitDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                titleStyle={styles.listTitle}
                description={`Bill: ₹${visit.payableAmount} | Paid: ₹${visit.paidAmount} | Due: ₹${visit.dueAmount}`}
                left={props => <Avatar.Icon {...props} icon="calendar-clock" size={40} backgroundColor="#e0f2f1" color="#004d40" />}
                right={props => (
                  <View style={styles.historyRight}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text variant="labelSmall" style={styles.purposeText}>{visit.purpose || "Regular Visit"}</Text>
                      {userInfo?.role === "admin" && (
                        <>
                          <IconButton 
                            icon="pencil" 
                            size={18} 
                            onPress={() => navigation.navigate("EditVisit", { visitId: visit._id, patientId })} 
                            iconColor="#004d40"
                            style={{ margin: 0 }}
                          />
                          <IconButton 
                            icon="delete" 
                            size={18} 
                            onPress={() => handleDeleteVisit(visit._id)} 
                            iconColor="#f44336"
                            style={{ margin: 0 }}
                          />
                        </>
                      )}
                    </View>
                  </View>
                )}
              />
            </Surface>
          ))
        ) : (
          <Surface style={styles.emptyCard} elevation={1}>
            <Avatar.Icon icon="calendar-blank" size={48} color="#bdbdbd" backgroundColor="#f5f5f5" />
            <Text variant="bodyMedium" style={styles.emptyText}>No visits recorded yet</Text>
          </Surface>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Record Payment</Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>Outstanding: ₹{patient.totalDue}</Text>
          <TextInput
            label="Amount Paid"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            activeOutlineColor="#004d40"
            left={<TextInput.Icon icon="currency-inr" />}
          />
          <TextInput
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            style={styles.input}
            activeOutlineColor="#004d40"
          />
          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setVisible(false)} textColor="#666">Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleClearDue} 
              loading={paying} 
              disabled={paying || !paymentAmount}
              style={styles.modalButton}
            >
              Confirm
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 20,
    flex: 1,
  },
  patientName: {
    color: "white",
    fontWeight: "bold",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -12,
    marginTop: -5,
  },
  headerSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  dueSurface: {
    marginHorizontal: 20,
    marginTop: -50,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  dueHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  dueLabel: {
    color: "#757575",
    letterSpacing: 1,
  },
  dueAmount: {
    fontWeight: "bold",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  payButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#004d40",
    borderRadius: 12,
  },
  visitButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    borderColor: "#004d40",
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#333",
  },
  listItem: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
  },
  listTitle: {
    fontWeight: "bold",
  },
  historyRight: {
    justifyContent: "center",
    marginRight: 10,
  },
  purposeText: {
    color: "#004d40",
    backgroundColor: "#e0f2f1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#999",
  },
  modal: {
    backgroundColor: "white",
    padding: 24,
    margin: 20,
    borderRadius: 24,
  },
  modalTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  modalSubtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "white",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: "#004d40",
    borderRadius: 12,
    marginLeft: 10,
    paddingHorizontal: 10,
  },
});
