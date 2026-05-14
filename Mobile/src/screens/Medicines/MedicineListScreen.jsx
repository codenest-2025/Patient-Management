import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions } from "react-native";
import { Text, List, FAB, Avatar, Divider, IconButton, Portal, Modal, TextInput, Button, Searchbar, Chip, Surface, Dialog } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import { useDebounce } from "../../utils/useDebounce";

export default function MedicineListScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const { userInfo } = useContext(AuthContext);
  const isStaff = userInfo?.role === "staff";
  const socket = useContext(SocketContext);
  
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stock Update Modal State
  const [visible, setVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [stockAmount, setStockAmount] = useState("");
  const [updating, setUpdating] = useState(false);
  
  // Delete Confirmation State
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [medToDelete, setMedToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMedicines = async (pageNum = 1, shouldAppend = false, search = searchQuery, lowStock = lowStockOnly) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const { data } = await api.get(`/medicines`, {
        params: {
          page: pageNum,
          limit: isTablet ? 30 : 20,
          search: search,
          lowStock: lowStock
        }
      });

      if (shouldAppend) {
        setMedicines(prev => [...prev, ...(data.medicines || [])]);
      } else {
        setMedicines(data.medicines || []);
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
    fetchMedicines(1, false, searchQuery, lowStockOnly);
  }, [lowStockOnly]);

  // Fire fetch when debounced search value changes (300ms after user stops typing)
  useEffect(() => {
    fetchMedicines(1, false, debouncedSearch, lowStockOnly);
  }, [debouncedSearch, lowStockOnly]);

  useEffect(() => {
    if (socket) {
      const handler = () => {
        fetchMedicines(1, false, debouncedSearch, lowStockOnly);
      };
      socket.on("stock_changed", handler);
      return () => socket.off("stock_changed", handler);
    }
  }, [socket, debouncedSearch, lowStockOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMedicines(1, false, debouncedSearch, lowStockOnly);
  }, [debouncedSearch, lowStockOnly]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchMedicines(page + 1, true, debouncedSearch, lowStockOnly);
    }
  };

  // Only update state — the useEffect above fires the fetch after 300ms
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleUpdateStock = async (isIncrease) => {
    if (!stockAmount || isNaN(stockAmount) || !selectedMed) return;
    
    setUpdating(true);
    try {
      const amount = parseInt(stockAmount) * (isIncrease ? 1 : -1);
      await api.put(`/medicines/${selectedMed._id}/stock`, { amount });
      setVisible(false);
      setStockAmount("");
      fetchMedicines(1, false, searchQuery, lowStockOnly);
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

  const showDeleteDialog = (med) => {
    setMedToDelete(med);
    setDeleteVisible(true);
  };

  const hideDeleteDialog = () => {
    setDeleteVisible(false);
    setMedToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!medToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/medicines/${medToDelete._id}`);
      hideDeleteDialog();
      fetchMedicines(1, false, searchQuery, lowStockOnly);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const renderMedicineItem = ({ item }) => (
    <Surface style={[styles.card, isTablet && styles.tabletCard]} elevation={1}>
      <List.Item
        title={item.name}
        titleStyle={styles.medName}
        description={`Available Stock: ${item.stock}`}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon="pill"
            backgroundColor={item.stock < 10 ? "#ff980015" : "#004d4015"}
            color={item.stock < 10 ? "#ff9800" : "#004d40"}
          />
        )}
        right={(props) => (
          <IconButton 
            {...props}
            icon="plus-box" 
            iconColor="#004d40" 
            onPress={() => openStockModal(item)} 
          />
        )}
      />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#004d40", "#00695c"]} style={styles.header}>
        <View style={isTablet ? styles.headerContentTablet : styles.headerContent}>
          <Searchbar
            placeholder="Search medicines..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={[styles.searchBar, isTablet && { flex: 1, marginRight: 15 }]}
            iconColor="#004d40"
          />
          <View style={[styles.filterContainer, isTablet && { marginTop: 0 }]}>
            <Chip 
              selected={lowStockOnly} 
              onPress={() => setLowStockOnly(!lowStockOnly)}
              style={[styles.chip, lowStockOnly && styles.chipSelected]}
              textStyle={{ color: lowStockOnly ? "white" : "#004d40" }}
              icon={lowStockOnly ? "check" : "alert-outline"}
            >
              {"Low Stock (<10)"}
            </Chip>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item._id}
        renderItem={renderMedicineItem}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "tablet" : "mobile"}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004d40"]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#004d40" /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>{loading ? "Loading medicines..." : "No medicines found."}</Text>
          </View>
        }
      />

      <Portal>
        <FAB
          icon="plus"
          style={styles.fab}
          color="white"
          onPress={() => navigation.navigate("AddMedicine")}
          label={isTablet ? "Add Medicine" : ""}
        />
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)} 
          contentContainerStyle={[styles.modal, isTablet && { width: 500, alignSelf: "center" }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Update Stock: {selectedMed?.name}</Text>
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
              style={[styles.modalButton, { backgroundColor: "#4caf50" }, isStaff && { flex: 1 }]}
            >
              Add
            </Button>
            {!isStaff && (
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

          {!isStaff && (
            <>
              <Divider style={{ marginVertical: 20 }} />
              <View style={styles.secondaryActions}>
                <Button 
                  mode="outlined" 
                  icon="pencil"
                  onPress={() => {
                    setVisible(false);
                    navigation.navigate("AddMedicine", { medicine: selectedMed });
                  }}
                  style={[styles.secondaryButton, { borderColor: "#004d40" }]}
                  textColor="#004d40"
                >
                  Edit Name
                </Button>
                <Button 
                  mode="outlined" 
                  icon="delete"
                  onPress={() => {
                    setVisible(false);
                    showDeleteDialog(selectedMed);
                  }}
                  style={[styles.secondaryButton, { borderColor: "#f44336" }]}
                  textColor="#f44336"
                >
                  Delete
                </Button>
              </View>
            </>
          )}
        </Modal>

        <Dialog visible={deleteVisible} onDismiss={hideDeleteDialog} style={styles.deleteDialog}>
          <Dialog.Title style={styles.deleteTitle}>Confirm Delete</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete <Text style={{ fontWeight: "bold" }}>{medToDelete?.name}</Text>? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDeleteDialog} textColor="#757575">Cancel</Button>
            <Button 
              onPress={handleDeleteConfirm} 
              loading={deleting} 
              disabled={deleting}
              textColor="#f44336"
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  medName: {
    fontWeight: "bold",
    color: "#333",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: "#004d40",
    borderRadius: 20,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    padding: 30,
    margin: 20,
    borderRadius: 25,
  },
  modalTitle: {
    marginBottom: 10,
    fontWeight: "bold",
    color: "#004d40",
  },
  input: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 0.48,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 0.48,
    borderRadius: 10,
  },
  deleteDialog: {
    borderRadius: 20,
    backgroundColor: "white",
  },
  deleteTitle: {
    color: "#f44336",
    fontWeight: "bold",
  },
});
