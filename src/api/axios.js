// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // backend
  withCredentials: true, // important to send cookies
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
