import React from "react";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import MainNavigator from "./src/navigation/MainNavigator";
import { theme } from "./src/constants/theme";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
