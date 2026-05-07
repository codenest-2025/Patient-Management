import React, { useState, useContext } from "react";
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { TextInput, Button, Text, Surface, HelperText } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (e) {
      setError(e.response?.data?.message || "Login failed! Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#004d40", "#00695c", "#00897b"]}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.logoContainer}>
          <Surface style={styles.logoCircle} elevation={5}>
            <Image
              source={require("../../../assets/images/icon.png")} // Fallback to icon.png if logo not yet in assets
              style={styles.logo}
              resizeMode="contain"
            />
          </Surface>
          <Text variant="headlineMedium" style={styles.appTitle}>
            Patient
          </Text>
          <Text variant="bodyLarge" style={styles.appSubtitle}>
            Management System
          </Text>
        </View>

        <Surface style={styles.glassCard} elevation={0}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Welcome Back
          </Text>
          <Text variant="bodySmall" style={styles.cardSubtitle}>
            Enter your credentials to continue
          </Text>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            outlineColor="rgba(0,0,0,0.1)"
            activeOutlineColor="#004d40"
            left={<TextInput.Icon icon="account" color="#004d40" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            outlineColor="rgba(0,0,0,0.1)"
            activeOutlineColor="#004d40"
            left={<TextInput.Icon icon="lock" color="#004d40" />}
          />

          {error ? (
            <View style={styles.errorContainer}>
              <HelperText type="error" style={styles.errorText}>
                {error}
              </HelperText>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => { }}
            textColor="#666"
            style={styles.forgotBtn}
          >
            Forgot Password?
          </Button>
        </Surface>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  appTitle: {
    color: "white",
    fontWeight: "bold",
    letterSpacing: 4,
  },
  appSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  glassCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: "100%",
  },
  cardTitle: {
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#757575",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "white",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  errorText: {
    textAlign: "center",
    fontWeight: "bold",
  },
  button: {
    borderRadius: 12,
    backgroundColor: "#004d40",
    marginTop: 8,
    elevation: 4,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  forgotBtn: {
    marginTop: 10,
  },
});
