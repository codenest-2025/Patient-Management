import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, Card, TextInput, Button, IconButton, List, Divider, Surface, HelperText, Portal, Modal, Searchbar } from "react-native-paper";
import api from "../../services/api";

export default function EditVisitScreen({ route, navigation }) {
  const { visitId, patientId } = route.params;
  const [patient, setPatient] = useState(null);
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  
  // Form State
  const [payableAmount, setPayableAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Medicine Picker State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredMedicines = allMedicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes, vRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get("/medicines"),
          api.get(`/visits/${visitId}`)
        ]);
        
        setPatient(pRes.data);
        setAllMedicines(mRes.data.medicines || []);
        
        const currentVisit = vRes.data;
        if (currentVisit) {
          setPayableAmount(currentVisit.payableAmount.toString());
          setPaidAmount(currentVisit.paidAmount.toString());
          setPurpose(currentVisit.purpose || "");
          setSelectedMedicines(currentVisit.medicines.map(m => ({
            medicineId: m.medicineId._id || m.medicineId,
            name: m.medicineId.name || "Unknown",
            quantity: m.quantity,
            stock: 999 
          })));
        }
      } catch (e) {
        console.error(e);
        const errMsg = e.response?.status === 404 ? "This patient or visit record has been deleted." : "Failed to load visit details.";
        Alert.alert(
          "Error",
          errMsg,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [visitId, patientId]);

  const addMedicine = (med) => {
    const exists = selectedMedicines.find(
      m => m.medicineId === med._id || m.name.toLowerCase() === med.name.toLowerCase()
    );
    if (exists) {
      Alert.alert("Already Selected", `${med.name} is already added to this visit list.`);
      return;
    }
    
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
        return { ...m, quantity: newQty };
      }
      return m;
    }));
  };

  const handleUpdateVisit = async () => {
    if (!payableAmount || isNaN(payableAmount)) {
      setError("Please enter a valid payable amount");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const visitData = {
        medicines: selectedMedicines.map(m => ({
          medicineId: m.medicineId,
          quantity: m.quantity
        })),
        payableAmount: parseFloat(payableAmount),
        paidAmount: parseFloat(paidAmount || 0),
        purpose
      };

      await api.put(`/visits/${visitId}`, visitData);
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update visit");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this visit history? This will automatically restore medicine stocks and adjust the patient's outstanding balance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await api.delete(`/visits/${visitId}`);
              Alert.alert("Success", "Visit deleted successfully");
              navigation.goBack();
            } catch (e) {
              console.error(e);
              Alert.alert("Error", e.response?.data?.message || "Failed to delete visit");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const dueAmount = (parseFloat(payableAmount || 0) - parseFloat(paidAmount || 0)).toFixed(2);

  if (loading || !patient) return null;

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="titleLarge" style={styles.patientName}>Edit Visit: {patient.name}</Text>
        <Text style={styles.headerSubtitle}>Correcting mistakes in visit record</Text>
      </Surface>

      <Card style={styles.sectionCard}>
        <Card.Title title="Medicines" left={(props) => <List.Icon {...props} icon="pill" />} />
        <Card.Content>
          <Button 
            mode="outlined" 
            onPress={() => setPickerVisible(true)}
            icon="pill"
            contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }}
            style={styles.pickerTrigger}
          >
            Add Medicine
          </Button>

          <Portal>
            <Modal
              visible={pickerVisible}
              onDismiss={() => setPickerVisible(false)}
              contentContainerStyle={styles.pickerModal}
            >
              <View style={styles.pickerHeader}>
                <Text variant="titleLarge" style={styles.pickerTitle}>Select Medicine</Text>
                <IconButton icon="close" size={24} onPress={() => setPickerVisible(false)} />
              </View>
              
              <Searchbar
                placeholder="Search medicine..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.pickerSearch}
                iconColor="#004d40"
              />

              <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
                {filteredMedicines.map(med => (
                  <List.Item
                    key={med._id}
                    title={med.name}
                    description={`In Stock: ${med.stock}`}
                    left={props => <List.Icon {...props} icon="pill" color={med.stock > 0 ? "#004d40" : "#ccc"} />}
                    onPress={() => {
                      addMedicine(med);
                      setPickerVisible(false);
                      setSearchQuery("");
                    }}
                    disabled={med.stock <= 0}
                    style={[styles.pickerItem, med.stock <= 0 && { opacity: 0.5 }]}
                  />
                ))}
                {filteredMedicines.length === 0 && (
                  <Text style={styles.noResults}>No medicines found</Text>
                )}
              </ScrollView>
            </Modal>
          </Portal>

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
            <Text>Updated Due:</Text>
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
            onPress={handleUpdateVisit}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            Update Visit & Adjust Stock
          </Button>

          <Button
            mode="outlined"
            onPress={handleDeleteVisit}
            loading={saving}
            disabled={saving}
            textColor="#f44336"
            style={styles.deleteButton}
            icon="delete"
          >
            Delete Visit Record
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
  headerSubtitle: {
    color: "#e0f2f1",
    fontSize: 12,
    marginTop: 4,
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
  pickerTrigger: {
    marginBottom: 10,
    borderColor: "#004d40",
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerModal: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 24,
    maxHeight: "80%",
    padding: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  pickerTitle: {
    fontWeight: "bold",
    color: "#004d40",
  },
  pickerSearch: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 10,
    elevation: 0,
  },
  pickerList: {
    marginTop: 10,
  },
  pickerItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  noResults: {
    textAlign: "center",
    marginTop: 20,
    color: "#999",
  },
  medName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#004d40",
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
  deleteButton: {
    marginTop: 15,
    paddingVertical: 5,
    borderColor: "#f44336",
    borderWidth: 1,
  },
});
