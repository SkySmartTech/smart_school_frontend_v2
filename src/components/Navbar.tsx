import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Toolbar,
  Badge,
  Menu,
  MenuItem,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Fullscreen as FullscreenIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useCustomTheme } from "../context/ThemeContext";
import AnimatedSwitch from "../components/AnimatedSwitch";
import { useTeacherProfile } from "../hooks/useTeacherProfile"; // ✅ Import hook

interface NavbarProps {
  title: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Navbar = ({ title, sidebarOpen, setSidebarOpen }: NavbarProps) => {
  const { mode, toggleTheme } = useCustomTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] =
    useState<null | HTMLElement>(null);
  const [notificationCount] = useState(3);
  const navigate = useNavigate();

  // ✅ Fetch teacher profile using react-query
  const { data: userProfile, isLoading, isError } = useTeacherProfile();

  // Account menu handlers
  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    navigate("/userProfile");
    handleAccountMenuClose();
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    handleAccountMenuClose();
  };

  // Notifications menu handlers
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleViewAllNotifications = () => {
    navigate("/notifications");
    handleNotificationMenuClose();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <Toolbar>
      {/* Sidebar toggle button */}
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        sx={{ mr: 2 }}
      >
        <MenuIcon />
      </IconButton>

      {/* Title */}
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{ flexGrow: 1, fontWeight: 600 }}
      >
        {title}
      </Typography>

      {/* Right side icons */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {/* Dark mode toggle */}
        <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
          <AnimatedSwitch
            checked={mode === "dark"}
            onChange={toggleTheme}
            inputProps={{ "aria-label": "dark mode toggle" }}
          />
        </Box>

        {/* Notifications */}
        <IconButton onClick={handleNotificationMenuOpen}>
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={notificationAnchorEl}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          sx={{ "& .MuiPaper-root": { width: 300, maxHeight: 400 } }}
        >
          <MenuItem disabled>
            <Typography variant="body2">
              You have {notificationCount} new notifications
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem>
            <Typography variant="body2">Notification 1</Typography>
          </MenuItem>
          <MenuItem>
            <Typography variant="body2">Notification 2</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleViewAllNotifications}>
            <Button fullWidth variant="contained" size="small">
              View All Notifications
            </Button>
          </MenuItem>
        </Menu>

        {/* Fullscreen button */}
        <IconButton onClick={toggleFullscreen}>
          <FullscreenIcon />
        </IconButton>

        {/* ✅ Username + Account dropdown */}
        <Box
          sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={handleAccountMenuOpen}
        >
          {isLoading ? (
            <CircularProgress size={18} sx={{ mr: 1 }} />
          ) : isError ? (
            <Typography variant="body1" sx={{ mr: 1, color: "error.main" }}>
              Error
            </Typography>
          ) : (
            <Typography
              variant="body1"
              sx={{ mr: 1, display: { xs: "none", sm: "block" }, fontWeight: 500 }}
            >
              {userProfile?.name || "Guest"}
            </Typography>
          )}
          <IconButton color="inherit" sx={{ p: 0 }}>
            <AccountCircleIcon />
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAccountMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={handleProfileClick}>User Profile</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Box>
    </Toolbar>
  );
};

export default Navbar;
