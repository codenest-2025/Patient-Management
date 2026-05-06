import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, TextInput, Button, IconButton, List, Divider, Surface, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../../services/api";

export default function CreateVisitScreen({ route, navigation }) {
  const { patientId } = route.params;
  const [patient, setPatient] = useState(null);
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  
  // Form State
  const [payableAmount, setPayableAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get("/medicines")
        ]);
        setPatient(pRes.data);
        setAllMedicines(mRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [patientId]);

  const addMedicine = (med) => {
    const exists = selectedMedicines.find(m => m.medicineId === med._id);
    if (exists) return;
    
    setSelectedMedicines([...selectedMedicines, { 
      medicineId: med._id, 
      name: med.name, 
      quantity: 1, 
      stock: med.stock 
    }]);
  };

  const removeMedicine = (id) => {
    setSelectedMedicines(selectedMedicines.filter(m => m.medicineId !== id));
  };

  const updateQuantity = (id, change) => {
    setSelectedMedicines(selectedMedicines.map(m => {
      if (m.medicineId === id) {
        const newQty = Math.max(1, m.quantity + change);
        return { ...m, quantity: Math.min(newQty, m.stock) };
      }
      return m;
    }));
  };

  const handleCreateVisit = async () => {
    if (!payableAmount || isNaN(payableAmount)) {
      setError("Please enter a valid payable amount");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const visitData = {
        patientId,
        medicines: selectedMedicines.map(m => ({
          medicineId: m.medicineId,
          quantity: m.quantity
        })),
        payableAmount: parseFloat(payableAmount),
        paidAmount: parseFloat(paidAmount || 0),
        purpose
      };

      await api.post("/visits", visitData);
      navigation.navigate("PatientDetail", { patientId });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to record visit");
    } finally {
      setLoading(false);
    }
  };

  const dueAmount = (parseFloat(payableAmount || 0) - parseFloat(paidAmount || 0)).toFixed(2);

  if (!patient) return null;

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="titleLarge" style={styles.patientName}>Visit for: {patient.name}</Text>
        <Text style={styles.patientMobile}>{patient.mobile1}</Text>
      </Surface>

      <Card style={styles.sectionCard}>
        <Card.Title title="Select Medicines" left={(props) => <List.Icon {...props} icon="pill" />} />
        <Card.Content>
          <View style={styles.medicineList}>
            {allMedicines.map(med => (
              <TouchableOpacity 
                key={med._id} 
                onPress={() => addMedicine(med)}
                disabled={med.stock <= 0}
              >
                <Surface style={[styles.medChip, med.stock <= 0 && styles.disabledMed]}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medStock}>Qty: {med.stock}</Text>
                </Surface>
              </TouchableOpacity>
            ))}
          </View>

          <Divider style={styles.divider} />
          
          <Text variant="titleMedium" style={styles.subTitle}>Selected Items</Text>
          {selectedMedicines.length > 0 ? (
            selectedMedicines.map(m => (
              <List.Item
                key={m.medicineId}
                title={m.name}
                right={() => (
                  <View style={styles.qtyContainer}>
                    <IconButton icon="minus-circle-outline" size={20} onPress={() => updateQuantity(m.medicineId, -1)} />
                    <Text style={styles.qtyText}>{m.quantity}</Text>
                    <IconButton icon="plus-circle-outline" size={20} onPress={() => updateQuantity(m.medicineId, 1)} />
                    <IconButton icon="close-circle" iconColor="#f44336" size={20} onPress={() => removeMedicine(m.medicineId)} />
                  </View>
                )}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No medicines selected</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Title title="Billing & Details" left={(props) => <List.Icon {...props} icon="calculator" />} />
        <Card.Content>
          <TextInput
            label="Total Payable (₹) *"
            value={payableAmount}
            onChangeText={setPayableAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Amount Paid (₹)"
            value={paidAmount}
            onChangeText={setPaidAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          
          <View style={styles.dueContainer}>
            <Text>Remaining Due:</Text>
            <Text variant="titleLarge" style={{ color: dueAmount > 0 ? "#f44336" : "#4caf50" }}>₹{dueAmount}</Text>
          </View>

          <TextInput
            label="Visit Purpose / Notes"
            value={purpose}
            onChangeText={setPurpose}
            mode="outlined"
            style={styles.input}
          />

          {error ? <HelperText type="error">{error}</HelperText> : null}

          <Button
            mode="contained"
            onPress={handleCreateVisit}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          >
            Record Visit & Update Stock
          </Button>
        </Card.Content>
      </Card>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#004d40",
  },
  patientName: {
    color: "white",
    fontWeight: "bold",
  },
  patientMobile: {
    color: "#e0f2f1",
  },
  sectionCard: {
    margin: 10,
    borderRadius: 12,
    backgroundColor: "white",
  },
  medicineList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  medChip: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#e0f2f1",
    margin: 4,
    minWidth: 80,
    alignItems: "center",
  },
  disabledMed: {
    backgroundColor: "#eee",
  },
  medName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#004d40",
  },
  medStock: {
    fontSize: 10,
    color: "#757575",
  },
  divider: {
    marginVertical: 15,
  },
  subTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 5,
  },
  emptyText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
  input: {
    marginBottom: 12,
  },
  dueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 5,
    backgroundColor: "#004d40",
  },
});
