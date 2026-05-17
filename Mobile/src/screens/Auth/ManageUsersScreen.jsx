import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Alert, useWindowDimensions, ActivityIndicator } from "react-native";
import { Text, List, Avatar, IconButton, Surface, Switch, Portal, Modal, TextInput, Button, Divider, Chip, Searchbar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { SocketContext } from "../../context/SocketContext";

export default function ManageUsersScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const socket = useContext(SocketContext);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(""); // empty means all
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async (pageNum = 1, shouldAppend = false, search = searchQuery, role = roleFilter) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const { data } = await api.get("/auth/users", {
        params: {
          page: pageNum,
          limit: isTablet ? 20 : 10,
          search: search,
          role: role
        }
      });

      if (shouldAppend) {
        setUsers(prev => [...prev, ...(data.users || [])]);
      } else {
        setUsers(data.users || []);
      }
      
      setTotalPages(data.pages || 1);
      setPage(data.page || 1);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to fetch users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, false, searchQuery, roleFilter);
  }, [roleFilter]);

  useEffect(() => {
    if (socket) {
      const handleUserChange = () => {
        console.log("Real-time staff user update received");
        fetchUsers(1, false, searchQuery, roleFilter);
      };

      socket.on("user_changed", handleUserChange);

      return () => {
        socket.off("user_changed", handleUserChange);
      };
    }
  }, [socket, searchQuery, roleFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(1, false, searchQuery, roleFilter);
  }, [searchQuery, roleFilter]);

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchUsers(page + 1, true, searchQuery, roleFilter);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchUsers(1, false, query, roleFilter);
  };

  const handleToggleStatus = async (user) => {
    try {
      const userId = typeof user._id === "object" ? user._id.$oid || user._id.toString() : user._id;
      await api.put(`/auth/users/${userId}`, { isActive: !user.isActive });
      fetchUsers(1, false, searchQuery, roleFilter);
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to update status";
      Alert.alert("Error", msg);
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${user.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const userId = typeof user._id === "object" ? user._id.$oid || user._id.toString() : user._id;
              await api.delete(`/auth/users/${userId}`);
              fetchUsers(1, false, searchQuery, roleFilter);
            } catch (e) {
              const msg = e.response?.data?.message || "Failed to delete user";
              Alert.alert("Error", msg);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setNewUsername(user.username);
    setNewPassword("");
    setEditVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!newUsername) return;
    setUpdating(true);
    try {
      const payload = { username: newUsername };
      if (newPassword) payload.password = newPassword;
      
      const userId = typeof selectedUser._id === "object" ? selectedUser._id.$oid || selectedUser._id.toString() : selectedUser._id;
      await api.put(`/auth/users/${userId}`, payload);
      setEditVisible(false);
      fetchUsers(1, false, searchQuery, roleFilter);
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to update user";
      Alert.alert("Error", msg);
    } finally {
      setUpdating(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <Surface style={[styles.card, isTablet && styles.tabletCard]} elevation={1}>
      <List.Item
        title={item.username}
        titleStyle={styles.username}
        description={`Role: ${item.role.toUpperCase()}`}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={item.role === "staff" ? "account-tie" : "account-cog"}
            backgroundColor={item.isActive ? "#004d4015" : "#f4433615"}
            color={item.isActive ? "#004d40" : "#f44336"}
          />
        )}
        right={(props) => (
          <View style={styles.rightActions}>
            <View style={styles.statusContainer}>
               <Text variant="labelSmall" style={{ color: item.isActive ? "#4caf50" : "#f44336", marginRight: 8 }}>
                {item.isActive ? "ACTIVE" : "INACTIVE"}
              </Text>
              <Switch
                value={item.isActive}
                onValueChange={() => handleToggleStatus(item)}
                color="#004d40"
              />
            </View>
            <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} />
            <IconButton icon="delete" size={20} iconColor="#f44336" onPress={() => handleDeleteUser(item)} />
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
            placeholder="Search staff..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={[styles.searchBar, isTablet && { flex: 1, marginRight: 15 }]}
            iconColor="#004d40"
          />
          <View style={[styles.filterContainer, isTablet && { marginTop: 0 }]}>
            <Chip 
              selected={roleFilter === ""} 
              onPress={() => setRoleFilter("")}
              style={[styles.chip, roleFilter === "" && styles.chipSelected]}
              textStyle={{ color: roleFilter === "" ? "white" : "#004d40" }}
            >
              All
            </Chip>
            <Chip 
              selected={roleFilter === "admin"} 
              onPress={() => setRoleFilter("admin")}
              style={[styles.chip, roleFilter === "admin" && styles.chipSelected]}
              textStyle={{ color: roleFilter === "admin" ? "white" : "#004d40" }}
            >
              Admin
            </Chip>
            <Chip 
              selected={roleFilter === "staff"} 
              onPress={() => setRoleFilter("staff")}
              style={[styles.chip, roleFilter === "staff" && styles.chipSelected]}
              textStyle={{ color: roleFilter === "staff" ? "white" : "#004d40" }}
            >
              Staff
            </Chip>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "tablet" : "mobile"}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#004d40"]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#004d40" /> : null}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>{loading ? "Loading users..." : "No users found."}</Text>
          </View>
        }
      />

      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={[styles.modal, isTablet && { width: 500, alignSelf: "center" }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Edit User</Text>
          <TextInput
            label="Username"
            value={newUsername}
            onChangeText={setNewUsername}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="New Password (leave blank to keep current)"
            value={newPassword}
            onChangeText={setNewPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateUser}
              loading={updating}
              style={[styles.modalButton, { backgroundColor: "#004d40" }]}
            >
              Update
            </Button>
          </View>
        </Modal>
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
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "#e0f2f1",
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 10,
  },
  chipSelected: {
    backgroundColor: "#004d40",
  },
  list: {
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
  username: {
    fontWeight: "bold",
    color: "#333",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  center: {
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
    marginBottom: 20,
    fontWeight: "bold",
    color: "#004d40",
  },
  input: {
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButton: {
    marginLeft: 10,
    borderRadius: 10,
  },
});
