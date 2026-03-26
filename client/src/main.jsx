import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./ThemeContext";
import rootReducers from "./redux/reducers.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
// import { MsalProvider } from "@azure/msal-react";
// import { PublicClientApplication } from "@azure/msal-browser";
// import { msalConfig } from "./Service/ssoConfig.js";

// const msalInstance = new PublicClientApplication(msalConfig);

const store = configureStore({
  reducer: rootReducers,
});
const queryClient = new QueryClient(); // Create a QueryClient instance
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* <MsalProvider instance={msalInstance}> */}
        <ThemeProvider>
          <App />
          <Toaster />
        </ThemeProvider>
        {/* </MsalProvider> */}
      </BrowserRouter>
    </QueryClientProvider>
  </Provider>
);
