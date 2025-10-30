import { useState } from "react";
import { Box, Stack, Card } from "@mui/material";
import LoginForm from "./LoginForm";
import ForgotPasswordDialog from "./ForgotPasswordDialog"; 

const Login = () => {
  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false); 

  return (
    <Stack
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: 'url("/images/b.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: { xs: 1, sm: 2 },
      }}
    >
      <Card 
        sx={{ 
          width: "100%",
          maxWidth: { xs: "100%", sm: 500, md: 1000 },
          maxHeight: { xs: "100vh", sm: "95vh", md: "90vh" },
          boxShadow: { xs: 2, sm: 3, md: 4 },
          borderRadius: { xs: "20px", sm: "25px", md: "30px" },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflow: "hidden",
          margin: { xs: "10px 0", sm: "15px 0", md: "20px 0" }
        }}
      >
        {/* Left Side with Image - Hidden on mobile, visible on desktop */}
        <Box
          sx={{
            flex: { md: 1 },
            backgroundImage: 'url("/images/b5.jpg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: { xs: "none", md: "block" },
            minHeight: { md: "400px" },
            position: "relative",
          }}
        >
          {/* Logo Box */}
          <Box
            sx={{
              position: "absolute",
              top: { md: 20 },
              left: { md: 20 },
              padding: { md: "8px 16px" },
              borderRadius: "10px",
              fontWeight: "bold",
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          >
            {/* Add your logo content here if needed */}
          </Box>
        </Box>

        {/* Right Side - Login Form */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: { xs: 2, sm: 3, md: 4 },
            maxHeight: { xs: "100vh", sm: "95vh", md: "90vh" },
            overflowY: "auto",
            width: "100%",
            // Custom scrollbar styling for better mobile experience
            "&::-webkit-scrollbar": {
              width: { xs: "4px", sm: "6px" },
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(0,0,0,0.2)",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "rgba(0,0,0,0.3)",
            },
          }}
        >
          {/* Use the LoginForm component here */}
          <LoginForm
            onForgotPasswordClick={() => setOpenForgotPasswordDialog(true)} 
          />
        </Box>
      </Card>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={openForgotPasswordDialog}
        handleClose={() => setOpenForgotPasswordDialog(false)}
      />
    </Stack>
  );
};

export default Login;