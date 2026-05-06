import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, HelperText, Surface } from "react-native-paper";
import api from "../../services/api";

export default function AddPatientScreen({ navigation }) {
  const [name, setName] = useState("");
  const [mobile1, setMobile1] = useState("");
  const [mobile2, setMobile2] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddPatient = async () => {
    if (!name || !mobile1) {
      setError("Name and Mobile Number are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/patients", {
        name,
        mobile1,
        mobile2,
        address,
      });
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to add patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>Patient Details</Text>
        
        <TextInput
          label="Patient Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Mobile Number *"
          value={mobile1}
          onChangeText={setMobile1}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TextInput
          label="Alternate Mobile (Optional)"
          value={mobile2}
          onChangeText={setMobile2}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TextInput
          label="Address"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleAddPatient}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Save Patient
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
    borderRadius: 10,
    backgroundColor: "white",
  },
  title: {
    marginBottom: 20,
    color: "#004d40",
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
    backgroundColor: "#004d40",
  },
});
