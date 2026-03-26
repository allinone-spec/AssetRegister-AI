import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, } from "@mui/material";
import AppRoute from "./routes/AppRoute";
import { useTheme } from "./ThemeContext";

const App = () => {
  const { bgColor } = useTheme();
  const theme = createTheme({
    palette: {
      background: {
        default: bgColor.backgroundColor,
      },
    },
    typography: {
      fontFamily: "Roboto, Arial, sans-serif",
      allVariants: {
        color: bgColor.textColor,
      },
    },
  });


  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <div
        className="font-plus-jakarta"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: `${bgColor.backgroundColor}`
        }}
      >

        <AppRoute />
      </div>
    </MuiThemeProvider>
  );
};

export default App;
