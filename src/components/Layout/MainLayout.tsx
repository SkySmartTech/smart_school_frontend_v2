import { useState } from "react";
import { Box, AppBar } from "@mui/material";
import { Outlet } from "react-router-dom";

const drawerWidth = 240;
const collapsedWidth = 60;

const MainLayout = () => {
  const [open] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)` },
          ml: { sm: `${open ? drawerWidth : collapsedWidth}px` },
          transition: theme => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
       
      </AppBar>

     <Outlet />
    </Box>
  );
};

export default MainLayout;