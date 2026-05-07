import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions } from "react-native";
import { Text, List, Avatar, Divider, Chip, Searchbar, Surface } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { SocketContext } from "../../context/SocketContext";

export default function VisitHistoryScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const socket = useContext(SocketContext);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVisits = async (pageNum = 1, shouldAppend = false, search = searchQuery, filter = dateFilter) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let startDate, endDate;
      if (filter === "today") {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === "week") {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date();
      }

      const { data } = await api.get("/visits", {
        params: {
          page: pageNum,
          limit: isTablet ? 30 : 20,
          search: search,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      });

      if (shouldAppend) {
        setVisits(prev => [...prev, ...(data.visits || [])]);
      } else {
        setVisits(data.visits || []);
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

  useEffect(() => {
    fetchVisits(1, false, searchQuery, dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        fetchVisits(1, false, searchQuery, dateFilter);
      };
      socket.on("visit_added", handler);
      return () => socket.off("visit_added", handler);
    }
  }, [socket, searchQuery, dateFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits(1, false, searchQuery, dateFilter);
  }, [searchQuery, dateFilter]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchVisits(page + 1, true, searchQuery, dateFilter);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchVisits(1, false, query, dateFilter);
  };

  const renderVisitItem = ({ item }) => (
    <Surface style={[styles.card, isTablet && styles.tabletCard]} elevation={1}>
      <List.Item
        title={item.patientId?.name || "Unknown Patient"}
        titleStyle={styles.patientName}
        description={`Date: ${new Date(item.visitDate).toLocaleDateString()} | ${item.purpose || "General Visit"}`}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon="calendar-clock"
            backgroundColor="#004d4010"
            color="#004d40"
          />
        )}
        right={() => (
          <View style={styles.rightContainer}>
            <Text style={styles.amount}>₹{item.payableAmount}</Text>
            {item.dueAmount > 0 ? (
              <Chip icon="alert-circle" compact selectedColor="white" style={styles.dueChip} textStyle={styles.chipText}>Due</Chip>
            ) : (
              <Chip icon="check-circle" compact selectedColor="white" style={styles.paidChip} textStyle={styles.chipText}>Paid</Chip>
            )}
          </View>
        )}
      />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#004d40", "#00695c"]} style={styles.header}>
        <View style={isTablet ? styles.headerContentTablet : styles.headerContent}>
          <Searchbar
            placeholder="Search visits..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={[styles.searchBar, isTablet && { flex: 1, marginRight: 15 }]}
            iconColor="#004d40"
          />
          <View style={[styles.filterContainer, isTablet && { marginTop: 0 }]}>
            <Chip 
              selected={dateFilter === "all"} 
              onPress={() => setDateFilter("all")}
              style={[styles.chip, dateFilter === "all" && styles.chipSelected]}
              textStyle={{ color: dateFilter === "all" ? "white" : "#004d40" }}
            >
              All
            </Chip>
            <Chip 
              selected={dateFilter === "today"} 
              onPress={() => setDateFilter("today")}
              style={[styles.chip, dateFilter === "today" && styles.chipSelected]}
              textStyle={{ color: dateFilter === "today" ? "white" : "#004d40" }}
            >
              Today
            </Chip>
            <Chip 
              selected={dateFilter === "week"} 
              onPress={() => setDateFilter("week")}
              style={[styles.chip, dateFilter === "week" && styles.chipSelected]}
              textStyle={{ color: dateFilter === "week" ? "white" : "#004d40" }}
            >
              Week
            </Chip>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={visits}
        keyExtractor={(item) => item._id}
        renderItem={renderVisitItem}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "tablet" : "mobile"}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004d40"]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#004d40" /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>{loading ? "Loading visits..." : "No visits found for this period."}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "column",
  },
  headerContentTablet: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 15,
    height: 50,
    elevation: 4,
  },
  filterContainer: {
    flexDirection: "row",
    marginTop: 15,
  },
  chip: {
    backgroundColor: "#e0f2f1",
    marginRight: 8,
    borderRadius: 10,
  },
  chipSelected: {
    backgroundColor: "#004d40",
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "white",
    margin: 6,
    borderRadius: 15,
    overflow: "hidden",
    flex: 1,
  },
  tabletCard: {
    flex: 0.5,
  },
  patientName: {
    fontWeight: "bold",
    color: "#333",
  },
  rightContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: 10,
  },
  amount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#004d40",
  },
  dueChip: {
    backgroundColor: "#f44336",
    marginTop: 4,
    borderRadius: 6,
  },
  paidChip: {
    backgroundColor: "#4caf50",
    marginTop: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
});
