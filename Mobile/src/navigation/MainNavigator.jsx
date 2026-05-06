import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthContext } from "../context/AuthContext";
import LoginScreen from "../screens/Auth/LoginScreen";
import DashboardScreen from "../screens/Dashboard/DashboardScreen";

// Patients
import PatientListScreen from "../screens/Patients/PatientListScreen";
import AddPatientScreen from "../screens/Patients/AddPatientScreen";
import PatientDetailScreen from "../screens/Patients/PatientDetailScreen";

// Medicines
import MedicineListScreen from "../screens/Medicines/MedicineListScreen";
import AddMedicineScreen from "../screens/Medicines/AddMedicineScreen";

// Visits
import VisitHistoryScreen from "../screens/Visits/VisitHistoryScreen";
import CreateVisitScreen from "../screens/Visits/CreateVisitScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PatientStack = createNativeStackNavigator();
function PatientStackScreen() {
  return (
    <PatientStack.Navigator>
      <PatientStack.Screen name="PatientList" component={PatientListScreen} options={{ title: "Patients" }} />
      <PatientStack.Screen name="AddPatient" component={AddPatientScreen} options={{ title: "Add New Patient" }} />
      <PatientStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: "Patient Details" }} />
      <PatientStack.Screen name="CreateVisit" component={CreateVisitScreen} options={{ title: "Create Visit" }} />
    </PatientStack.Navigator>
  );
}

const MedicineStack = createNativeStackNavigator();
function MedicineStackScreen() {
  return (
    <MedicineStack.Navigator>
      <MedicineStack.Screen name="MedicineList" component={MedicineListScreen} options={{ title: "Medicines" }} />
      <MedicineStack.Screen name="AddMedicine" component={AddMedicineScreen} options={{ title: "Add Medicine" }} />
    </MedicineStack.Navigator>
  );
}

const VisitStack = createNativeStackNavigator();
function VisitStackScreen() {
  return (
    <VisitStack.Navigator>
      <VisitStack.Screen name="VisitHistory" component={VisitHistoryScreen} options={{ title: "Visit History" }} />
    </VisitStack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "DashboardTab") iconName = "view-dashboard";
          else if (route.name === "PatientsTab") iconName = "account-group";
          else if (route.name === "MedicinesTab") iconName = "pill";
          else if (route.name === "VisitsTab") iconName = "history";
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#004d40",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ tabBarLabel: "Dashboard" }} />
      <Tab.Screen name="PatientsTab" component={PatientStackScreen} options={{ tabBarLabel: "Patients" }} />
      <Tab.Screen name="MedicinesTab" component={MedicineStackScreen} options={{ tabBarLabel: "Medicines" }} />
      <Tab.Screen name="VisitsTab" component={VisitStackScreen} options={{ tabBarLabel: "Visits" }} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#004d40" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken ? (
        <Stack.Screen name="Main" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
