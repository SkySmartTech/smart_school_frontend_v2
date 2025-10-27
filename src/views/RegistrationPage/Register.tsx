import { Box, Card, Stack } from "@mui/material";
import RegisterForm from "./RegisterForm";
import { useSnackbar } from "notistack";

const Register = () => {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Stack
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: 'url("/images/b.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Card 
        sx={{ 
          width: "90%", 
          maxWidth: 1000, 
          maxHeight: "90vh", 
          boxShadow: 4, 
          borderRadius: "30px", 
          display: "flex",
          overflow: "hidden", 
          margin: "20px 0" 
        }}
      >
        {/* Left Side with Image */}
        <Box
          sx={{
            flex: 1,
            backgroundImage: 'url("/images/b5.jpg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: { xs: "none", md: "block" }, 
            minHeight: "400px", 
          }}
        >
          {/* Logo Box */}
          <Box
            sx={{
              position: "absolute",
              top: 20,
              left: 20,
              padding: "8px 16px",
              borderRadius: "10px",
              fontWeight: "bold",
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          >
            
          </Box>
        </Box>

        {/* Right Side - Registration Form */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: { xs: 2, sm: 3, md: 4 }, 
             
            maxHeight: "90vh", 
          }}
        >
          <RegisterForm 
            onSuccess={() => {
              enqueueSnackbar("Registration successful!", { variant: "success" });
            }}
            onError={(error) => {
              enqueueSnackbar(error || "Registration failed", { variant: "error" });
            }}
          />
        </Box>
      </Card>
    </Stack>
  );
};

export default Register;