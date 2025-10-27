import { useState } from "react";
import {
  Box,
  Typography,
  AppBar,
  CssBaseline,
  Button,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import ConstructionIcon from "@mui/icons-material/Construction";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useCustomTheme } from "../context/ThemeContext";

const UnderDevelopmentPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const theme = useTheme();
  useCustomTheme();

  return (
    <Box
      sx={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        bgcolor: theme.palette.background.default,
      }}
    >
      <CssBaseline />
      {/* Sidebar */}
      <Sidebar open={sidebarOpen || hovered} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Navbar */}
        <AppBar
          position="static"
          sx={{
            bgcolor: "background.paper",
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.divider}`,
            zIndex: theme.zIndex.drawer + 1,
            color: theme.palette.text.primary,
          }}
        >
          <Navbar
            title="Under Development"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        {/* Body Content */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 2,
          }}
        >
          {/* Animated Icon */}
          <motion.div
            animate={{ rotate: [0, 20, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ConstructionIcon sx={{ fontSize: 120, color: "warning.main" }} />
          </motion.div>

          {/* Animated Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <Typography variant="h3" fontWeight="bold" mt={2} color="text.primary">
              🚧 Page Under Development 🚧
            </Typography>
          </motion.div>

          {/* Sub Text */}
          <Typography
            variant="body1"
            sx={{ maxWidth: 600, mt: 2, mb: 4, color: "text.secondary" }}
          >
            We’re working hard to bring you something amazing.  
            Stay tuned while we finish building this feature.
          </Typography>

          {/* Call to Action Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = "/managementStaff"}
            >
              Back to Dashboard
            </Button>
          </motion.div>

          {/* Decorative Banner Image */}
          <motion.img
            src="https://cdn.dribbble.com/users/1187836/screenshots/6540870/working.gif"
            alt="Under Development Animation"
            style={{ maxWidth: "500px", marginTop: "40px", borderRadius: "20px" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default UnderDevelopmentPage;
