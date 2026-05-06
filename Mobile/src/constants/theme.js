import { MD3LightTheme as DefaultTheme } from "react-native-paper";

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#064E3B", // Midnight Emerald
    secondary: "#059669", // Emerald
    accent: "#F59E0B", // Gold/Amber
    background: "#F8FAFC", // Slate 50
    surface: "#FFFFFF",
    error: "#DC2626",
    success: "#10B981",
    warning: "#F59E0B",
    outline: "rgba(0, 0, 0, 0.1)",
    glass: "rgba(255, 255, 255, 0.8)",
  },
  roundness: 16,
};
