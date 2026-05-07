import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { Text, List, Avatar, IconButton, Surface, Switch, Portal, Modal, TextInput, Button, Divider, Chip } from "react-native-paper";
import api from "../../services/api";

export default function ManageUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editVisible, setEditVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/auth/users");
      // Backend now returns { users, total, page, pages }
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to fetch users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      await api.put(`/auth/users/${user._id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (e) {
      Alert.alert("Error", "Failed to update status");
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
              await api.delete(`/auth/users/${user._id}`);
              fetchUsers();
            } catch (e) {
              Alert.alert("Error", "Failed to delete user");
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
      
      await api.put(`/auth/users/${selectedUser._id}`, payload);
      setEditVisible(false);
      fetchUsers();
    } catch (e) {
      Alert.alert("Error", "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={item.username}
        description={`Role: ${item.role.toUpperCase()}`}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={item.role === "staff" ? "account-tie" : "account"}
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
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>{loading ? "Loading users..." : "No other users found."}</Text>
          </View>
        }
      />

      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={styles.modal}
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
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
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
    marginTop: 50,
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    padding: 24,
    margin: 20,
    borderRadius: 24,
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
  },
});
