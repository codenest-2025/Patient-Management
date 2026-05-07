import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { Text, Card, List, Avatar, Button, IconButton, Surface, Portal, Modal, TextInput, HelperText } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import api from "../../services/api";

const { width } = Dimensions.get("window");

const SummaryCard = ({ title, value, icon, color }) => (
  <Surface style={styles.card} elevation={2}>
    <View style={[styles.cardAccent, { backgroundColor: color }]} />
    <View style={styles.cardInner}>
      <View style={styles.cardTextContainer}>
        <Text variant="labelMedium" style={styles.cardTitle}>{title}</Text>
        <Text variant="titleLarge" style={[styles.cardValue, { color }]}>{value}</Text>
      </View>
      <Avatar.Icon 
        size={44} 
        icon={icon} 
        backgroundColor={color + "15"} 
        color={color} 
      />
    </View>
  </Surface>
);

export default function DashboardScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, userInfo } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  // Add Manager State
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState("");

  const fetchSummary = async () => {
    try {
      const { data } = await api.get("/dashboard/summary");
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        console.log("Real-time update received on Dashboard");
        fetchSummary();
      };

      socket.on("patient_changed", handler);
      socket.on("stock_changed", handler);
      socket.on("visit_added", handler);

      return () => {
        socket.off("patient_changed", handler);
        socket.off("stock_changed", handler);
        socket.off("visit_added", handler);
      };
    }
  }, [socket]);

  const handleAddManager = async () => {
    if (!managerUsername || !managerPassword) {
      setManagerError("Username and Password are required");
      return;
    }
    setManagerLoading(true);
    setManagerError("");
    try {
      await api.post("/auth/register", {
        username: managerUsername,
        password: managerPassword,
        role: "manager",
      });
      setManagerModalVisible(false);
      setManagerUsername("");
      setManagerPassword("");
      alert("Manager added successfully!");
    } catch (e) {
      setManagerError(e.response?.data?.message || "Failed to add manager");
    } finally {
      setManagerLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={["#004d40", "#00796b"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text variant="headlineSmall" style={styles.headerTitle}>Heka Dashboard</Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Welcome back, {userInfo?.username || "Admin"}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            {userInfo?.role === "admin" && (
              <IconButton 
                icon="account-plus" 
                onPress={() => setManagerModalVisible(true)} 
                iconColor="white" 
                containerColor="rgba(255,255,255,0.2)"
                style={{ marginRight: 8 }}
              />
            )}
            <IconButton 
              icon="logout" 
              onPress={logout} 
              iconColor="white" 
              containerColor="rgba(255,255,255,0.2)"
            />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <View style={styles.col}>
            <SummaryCard
              title="Total Patients"
              value={summary?.totalPatients || 0}
              icon="account-group"
              color="#2196f3"
            />
          </View>
          <View style={styles.col}>
            <SummaryCard
              title="Total Visits"
              value={summary?.totalVisits || 0}
              icon="calendar-check"
              color="#4caf50"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <SummaryCard
              title="Total Dues"
              value={`₹${summary?.totalDueAmount || 0}`}
              icon="currency-inr"
              color="#f44336"
            />
          </View>
          <View style={styles.col}>
            <SummaryCard
              title="Medicines"
              value={summary?.totalMedicines || 0}
              icon="pill"
              color="#9c27b0"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Low Stock Alerts</Text>
        {summary?.lowStockMedicines?.length > 0 && (
          <Surface style={styles.alertBadge} elevation={0}>
            <Text style={styles.alertBadgeText}>{summary.lowStockMedicines.length}</Text>
          </Surface>
        )}
      </View>

      {summary?.lowStockMedicines?.length > 0 ? (
        summary.lowStockMedicines.map((med) => (
          <Surface key={med._id} style={styles.listItem} elevation={1}>
            <List.Item
              title={med.name}
              titleStyle={styles.listTitle}
              description={`Available Stock: ${med.stock}`}
              descriptionStyle={styles.listDescription}
              left={(props) => (
                <View style={styles.listIconContainer}>
                   <Avatar.Icon {...props} icon="alert-decagram" size={40} color="#ff9800" backgroundColor="#fff3e0" />
                </View>
              )}
            />
          </Surface>
        ))
      ) : (
        <Surface style={styles.emptyCard} elevation={1}>
          <Avatar.Icon icon="check-circle" size={48} color="#4caf50" backgroundColor="#e8f5e9" />
          <Text variant="bodyLarge" style={styles.emptyText}>All stocks are sufficient</Text>
        </Surface>
      )}
      
      <View style={{ height: 30 }} />

      <Portal>
        <Modal
          visible={managerModalVisible}
          onDismiss={() => setManagerModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add New Manager</Text>
          <TextInput
            label="Username"
            value={managerUsername}
            onChangeText={setManagerUsername}
            mode="outlined"
            style={styles.modalInput}
            autoCapitalize="none"
          />
          <TextInput
            label="Password"
            value={managerPassword}
            onChangeText={setManagerPassword}
            mode="outlined"
            style={styles.modalInput}
            secureTextEntry
          />
          {managerError ? <HelperText type="error">{managerError}</HelperText> : null}
          <Button
            mode="contained"
            onPress={handleAddManager}
            loading={managerLoading}
            style={styles.modalButton}
          >
            Create Manager
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  statsContainer: {
    padding: 15,
    marginTop: -20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 15,
  },
  col: {
    flex: 1,
    paddingHorizontal: 7,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardInner: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#757575",
    marginBottom: 4,
  },
  cardValue: {
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#333",
  },
  alertBadge: {
    backgroundColor: "#f44336",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  alertBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  listItem: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
  },
  listTitle: {
    fontWeight: "bold",
    color: "#333",
  },
  listDescription: {
    color: "#666",
  },
  listIconContainer: {
    justifyContent: "center",
    marginLeft: 10,
  },
  emptyCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  emptyText: {
    marginTop: 15,
    color: "#666",
    fontWeight: "500",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: "bold",
    color: "#004d40",
    textAlign: "center",
  },
  modalInput: {
    marginBottom: 15,
  },
  modalButton: {
    marginTop: 10,
    backgroundColor: "#004d40",
    paddingVertical: 6,
  },
});
