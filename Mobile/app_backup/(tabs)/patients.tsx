import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Button, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPatients, createPatient } from '@/services/patientService';

export default function PatientsScreen() {
  const [patients, setPatients] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [mobile1, setMobile1] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleCreatePatient = async () => {
    try {
      await createPatient({ name, mobile1, address });
      setModalVisible(false);
      setName('');
      setMobile1('');
      setAddress('');
      fetchPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Patients</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <FlatList
        data={patients}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ThemedView style={styles.patientItem}>
            <ThemedText type="subtitle">{item.name}</ThemedText>
            <ThemedText>{item.mobile1}</ThemedText>
            <ThemedText>Due: ₹{item.totalDue}</ThemedText>
          </ThemedView>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle">Add New Patient</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile"
              value={mobile1}
              onChangeText={setMobile1}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} color="red" />
              <Button title="Save" onPress={handleCreatePatient} />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  patientItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});
