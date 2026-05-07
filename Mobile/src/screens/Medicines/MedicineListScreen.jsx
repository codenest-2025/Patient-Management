import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Text, List, FAB, Avatar, Divider, IconButton, Portal, Modal, TextInput, Button } from "react-native-paper";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";

export default function MedicineListScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stock Update State
  const [visible, setVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [stockAmount, setStockAmount] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchMedicines = async () => {
    try {
      const { data } = await api.get("/medicines");
      setMedicines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        console.log("Stock update received via Socket");
        fetchMedicines();
      };

      socket.on("stock_changed", handler);

      return () => {
        socket.off("stock_changed", handler);
      };
    }
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMedicines();
  }, []);

  const handleUpdateStock = async (isIncrease) => {
    if (!stockAmount || isNaN(stockAmount) || !selectedMed) return;
    
    setUpdating(true);
    try {
      const amount = parseInt(stockAmount) * (isIncrease ? 1 : -1);
      await api.put(`/medicines/${selectedMed._id}/stock`, { amount });
      setVisible(false);
      setStockAmount("");
      fetchMedicines();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const openStockModal = (med) => {
    setSelectedMed(med);
    setVisible(true);
  };

  const renderMedicineItem = ({ item }) => (
    <List.Item
      title={item.name}
      description={`Available Stock: ${item.stock}`}
      left={(props) => (
        <Avatar.Icon
          {...props}
          icon="pill"
          backgroundColor={item.stock < 10 ? "#ff980020" : "#004d4020"}
          color={item.stock < 10 ? "#ff9800" : "#004d40"}
        />
      )}
      right={(props) => (
        <View style={styles.rightActions}>
          <IconButton icon="plus-box" iconColor="#004d40" onPress={() => openStockModal(item)} />
        </View>
      )}
      style={styles.listItem}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={medicines}
        keyExtractor={(item) => item._id}
        renderItem={renderMedicineItem}
        ItemSeparatorComponent={Divider}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>{loading ? "Loading medicines..." : "No medicines in stock."}</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="white"
        onPress={() => navigation.navigate("AddMedicine")}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge">Update Stock: {selectedMed?.name}</Text>
          <Text style={{ marginBottom: 15 }}>Current Stock: {selectedMed?.stock}</Text>
          <TextInput
            label="Amount"
            value={stockAmount}
            onChangeText={setStockAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button 
              mode="contained" 
              onPress={() => handleUpdateStock(true)} 
              loading={updating} 
              style={[styles.modalButton, { backgroundColor: "#4caf50" }, userInfo?.role === "manager" && { flex: 1 }]}
            >
              Add
            </Button>
            {userInfo?.role !== "manager" && (
              <Button 
                mode="contained" 
                onPress={() => handleUpdateStock(false)} 
                loading={updating} 
                style={[styles.modalButton, { backgroundColor: "#f44336" }]}
              >
                Remove
              </Button>
            )}
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listItem: {
    backgroundColor: "white",
    paddingVertical: 5,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#004d40",
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  input: {
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 0.48,
  },
});
