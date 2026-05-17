import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button, HelperText, Surface } from "react-native-paper";
import api from "../../services/api";
import { SocketContext } from "../../context/SocketContext";

export default function EditPatientScreen({ route, navigation }) {
  const { patientId } = route.params;
  const socket = useContext(SocketContext);
  const [name, setName] = useState("");
  const [mobile1, setMobile1] = useState("");
  const [mobile2, setMobile2] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPatient = async () => {
    try {
      const { data } = await api.get(`/patients/${patientId}`);
      setName(data.name);
      setMobile1(data.mobile1);
      setMobile2(data.mobile2 || "");
      setAddress(data.address || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        if (!saving) {
          console.log("Real-time update received on Edit Patient");
          fetchPatient();
        }
      };

      socket.on("patient_changed", handler);

      return () => {
        socket.off("patient_changed", handler);
      };
    }
  }, [socket, patientId, saving]);

  const handleUpdatePatient = async () => {
    if (!name) {
      setError("Patient Name is required");
      return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (mobile1 && !mobileRegex.test(mobile1)) {
      setError("Primary Mobile Number must be exactly 10 digits");
      return;
    }

    if (mobile2 && !mobileRegex.test(mobile2)) {
      setError("Alternate Mobile Number must be exactly 10 digits");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.put(`/patients/${patientId}`, {
        name,
        mobile1,
        mobile2,
        address,
      });
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading patient info...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>Edit Patient Details</Text>
        
        <TextInput
          label="Patient Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          activeOutlineColor="#004d40"
        />

        <TextInput
          label="Mobile Number (Optional)"
          value={mobile1}
          onChangeText={(text) => setMobile1(text.replace(/[^0-9]/g, ""))}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
          activeOutlineColor="#004d40"
        />

        <TextInput
          label="Alternate Mobile (Optional)"
          value={mobile2}
          onChangeText={(text) => setMobile2(text.replace(/[^0-9]/g, ""))}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
          activeOutlineColor="#004d40"
        />

        <TextInput
          label="Address"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          activeOutlineColor="#004d40"
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleUpdatePatient}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Update Patient
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
  },
  surface: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "white",
  },
  title: {
    marginBottom: 20,
    color: "#004d40",
    fontWeight: "bold",
  },
  input: {
    marginBottom: 15,
    backgroundColor: "white",
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
    backgroundColor: "#004d40",
    borderRadius: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
