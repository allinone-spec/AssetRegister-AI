import { LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "f8c7976f-3e93-482d-88a3-62a1133cbbc3", // Application (client) ID from Azure portal
    authority: "https://login.microsoftonline.com/common", // or your tenant ID
    redirectUri: "http://localhost:5173", // Must match registered redirect URI
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage"
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      }
    }
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};
