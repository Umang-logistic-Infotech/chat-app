import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("Token", token);
    if (
      token &&
      !config.url.includes("/login") &&
      !config.url.includes("/signup")
    ) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export { api };
