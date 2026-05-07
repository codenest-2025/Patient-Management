import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text, Searchbar, List, FAB, Avatar, Divider, Chip, Surface } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { SocketContext } from "../../context/SocketContext";

export default function PatientListScreen({ navigation }) {
  const socket = useContext(SocketContext);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPatients = async (pageNum = 1, shouldAppend = false, search = searchQuery, hasDue = dueOnly) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const { data } = await api.get(`/patients`, {
        params: {
          page: pageNum,
          limit: 15,
          search: search,
          hasDue: hasDue
        }
      });

      if (shouldAppend) {
        setPatients(prev => [...prev, ...(data.patients || [])]);
      } else {
        setPatients(data.patients || []);
      }

      setTotalPages(data.pages || 1);
      setPage(data.page || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPatients(1, false, searchQuery, dueOnly);
    }, [dueOnly])
  );

  useEffect(() => {
    if (socket) {
      const handler = () => {
        fetchPatients(1, false, searchQuery, dueOnly);
      };
      socket.on("patient_changed", handler);
      return () => socket.off("patient_changed", handler);
    }
  }, [socket, searchQuery, dueOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(1, false, searchQuery, dueOnly);
  }, [searchQuery, dueOnly]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchPatients(page + 1, true, searchQuery, dueOnly);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchPatients(1, false, query, dueOnly);
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
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#004d40"
          placeholderTextColor="#999"
          elevation={2}
        />
        <View style={styles.filterContainer}>
          <Chip
            selected={dueOnly}
            onPress={() => setDueOnly(!dueOnly)}
            style={[styles.chip, dueOnly && styles.chipSelected]}
            textStyle={{ color: dueOnly ? "white" : "white" }}
            selectedColor="white"
            icon={dueOnly ? "check" : "account-cash"}
          >
            Pending Due
          </Chip>
        </View>
      </LinearGradient>

      <FlatList
        data={patients}
        keyExtractor={(item) => item._id}
        renderItem={renderPatientItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004d40"]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 10 }} color="#004d40" /> : null}
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
    paddingTop: 65,
    paddingBottom: 35,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 18,
    height: 54,
    elevation: 0,
  },
  filterContainer: {
    flexDirection: "row",
    marginTop: 15,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  chipSelected: {
    backgroundColor: "#ff9800",
  },
  listContent: {
    padding: 20,
    paddingBottom: 110,
  },
  patientCard: {
    backgroundColor: "white",
    marginBottom: 15,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: "#004d40",
    borderRadius: 20,
    paddingHorizontal: 5,
    elevation: 6,
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
