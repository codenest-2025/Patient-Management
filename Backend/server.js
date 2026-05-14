const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const http = require("http");
const { init } = require("./config/socket");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = init(server);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/medicines", require("./routes/medicineRoutes"));
app.use("/api/visits", require("./routes/visitRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

// Render Keep-Alive: Self-ping every 14 minutes
const https = require("https");
const pingSelf = () => {
  const url = "https://patient-management-nif4.onrender.com/";
  setInterval(() => {
    https.get(url, (res) => {
      console.log(`Self-ping status: ${res.statusCode} - Keeping server awake`);
    }).on("error", (err) => {
      console.error("Self-ping failed:", err.message);
    });
  }, 2 * 60 * 1000); // 2 minutes (Testing)
};

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start self-ping if running in production (Render)
  if (process.env.NODE_ENV === "production" || true) {
    pingSelf();
  }
});
