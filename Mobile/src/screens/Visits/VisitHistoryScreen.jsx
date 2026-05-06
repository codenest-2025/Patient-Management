import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Text, List, Avatar, Divider, Chip } from "react-native-paper";
import api from "../../services/api";

export default function VisitHistoryScreen() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const { data } = await api.get("/visits");
      setVisits(data.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits();
  }, []);

  const renderVisitItem = ({ item }) => (
    <List.Item
      title={item.patientId?.name || "Unknown Patient"}
      description={`Date: ${new Date(item.visitDate).toLocaleDateString()} | Purpose: ${item.purpose || "N/A"}`}
      left={(props) => (
        <Avatar.Icon
          {...props}
          icon="calendar"
          backgroundColor="#004d4020"
          color="#004d40"
        />
      )}
      right={() => (
        <View style={styles.rightContainer}>
          <Text style={styles.amount}>₹{item.payableAmount}</Text>
          {item.dueAmount > 0 ? (
            <Chip style={styles.dueChip} textStyle={styles.chipText}>Due</Chip>
          ) : (
            <Chip style={styles.paidChip} textStyle={styles.chipText}>Paid</Chip>
          )}
        </View>
      )}
      style={styles.listItem}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visits}
        keyExtractor={(item) => item._id}
        renderItem={renderVisitItem}
        ItemSeparatorComponent={Divider}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>{loading ? "Loading visits..." : "No visits found."}</Text>
          </View>
        }
      />
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
    paddingVertical: 10,
  },
  rightContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#004d40",
  },
  dueChip: {
    backgroundColor: "#f44336",
    height: 24,
    marginTop: 4,
  },
  paidChip: {
    backgroundColor: "#4caf50",
    height: 24,
    marginTop: 4,
  },
  chipText: {
    fontSize: 10,
    color: "white",
    lineHeight: 12,
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
});
