import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Text, Searchbar, List, FAB, Avatar, Divider, Chip, Surface } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";

export default function PatientListScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = async (query = "") => {
    try {
      const { data } = await api.get(`/patients?search=${query}`);
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(searchQuery);
  }, [searchQuery]);

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    fetchPatients(query);
  };

  const renderPatientItem = ({ item }) => (
    <Surface style={styles.patientCard} elevation={1}>
      <List.Item
        title={item.name}
        titleStyle={styles.patientName}
        description={`${item.mobile1}${item.address ? " | " + item.address : ""}`}
        descriptionStyle={styles.patientDescription}
        left={(props) => (
          <Avatar.Text
            {...props}
            size={52}
            label={item.name.substring(0, 1).toUpperCase()}
            backgroundColor="#004d4015"
            color="#004d40"
            style={styles.avatar}
          />
        )}
        right={(props) => (
          <View style={styles.rightContainer}>
            {item.totalDue > 0 ? (
              <Chip 
                textStyle={styles.dueText} 
                style={styles.dueChip}
                compact
              >
                ₹{item.totalDue}
              </Chip>
            ) : (
              <Avatar.Icon icon="check-circle" size={24} color="#4caf50" backgroundColor="transparent" />
            )}
          </View>
        )}
        onPress={() => navigation.navigate("PatientDetail", { patientId: item._id })}
      />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#004d40", "#00695c"]}
        style={styles.searchContainer}
      >
        <Searchbar
          placeholder="Search patient..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#004d40"
          placeholderTextColor="#999"
          elevation={2}
        />
      </LinearGradient>

      <FlatList
        data={patients}
        keyExtractor={(item) => item._id}
        renderItem={renderPatientItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004d40"]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon icon="account-search-outline" size={80} color="#ccc" backgroundColor="transparent" />
            <Text variant="bodyLarge" style={styles.emptyText}>
              {loading ? "Searching patients..." : "No patients found"}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="white"
        onPress={() => navigation.navigate("AddPatient")}
        label="Add Patient"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  searchContainer: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 15,
    height: 50,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  patientCard: {
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  patientName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  patientDescription: {
    color: "#757575",
    fontSize: 13,
    marginTop: 2,
  },
  avatar: {
    marginLeft: 5,
  },
  rightContainer: {
    justifyContent: "center",
    marginRight: 5,
  },
  dueChip: {
    backgroundColor: "#ffebee",
    borderColor: "#ffcdd2",
  },
  dueText: {
    color: "#f44336",
    fontWeight: "bold",
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#004d40",
    borderRadius: 16,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#999",
  },
});
