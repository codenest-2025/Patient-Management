import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import api from "../../services/api";

export default function AddMedicineScreen({ navigation, route }) {
  const editMed = route.params?.medicine;
  
  const [name, setName] = useState(editMed?.name || "");
  const [stock, setStock] = useState(editMed?.stock?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSaveMedicine = async () => {
    if (!name || !stock) {
      setError("Medicine Name and Stock are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (editMed) {
        // Edit mode
        await api.put(`/medicines/${editMed._id}`, {
          name,
          stock: parseInt(stock),
        });
      } else {
        // Add mode
        await api.post("/medicines", {
          name,
          stock: parseInt(stock),
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.message || `Failed to ${editMed ? "update" : "add"} medicine`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="titleLarge" style={styles.title}>
          {editMed ? "Edit Medicine" : "New Medicine"}
        </Text>
        
        <TextInput
          label="Medicine Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Stock *"
          value={stock}
          onChangeText={setStock}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleSaveMedicine}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {editMed ? "Update Medicine" : "Add to Inventory"}
        </Button>
      </Surface>
    </View>
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
