import React from "react";
import logo from "./logo.svg";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import MainPage from "./MainPage/MainPage";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import HistoryDetailPage from "./HistoryDetailPage/HistoryDetailPage";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#292929",
      light: "#606060",
      dark: "#252525",
    },
    secondary: {
      main: "#313131",
      light: "#ffffff",
      dark: "#111111",
    },
    text: {
      primary: "#ffffff",
      secondary: "#aaaaaa",
    },
    background: {
      paper: "#202020",
      default: "#202020",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/detail" element={<HistoryDetailPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
