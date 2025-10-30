import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Alert
} from "@mui/material";
import {
  AccountCircle,
  Info,
  Visibility,
  VisibilityOff,
  Lock
} from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, validateUser } from "../../services/authService";
import { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword } from "../../api/userApi";
import { motion } from "framer-motion";

interface LoginFormProps {
  onForgotPasswordClick?: () => void;
}

interface LoginFormData {
  username: string;
  password: string;
}

interface BackendErrorResponse {
  message?: string;
  errors?: {
    username?: string[];
    password?: string[];
  };
}

const LoginForm = ({ onForgotPasswordClick }: LoginFormProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors
  } = useForm<LoginFormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    const rememberedUsername = localStorage.getItem("rememberedUsername");
    if (rememberedUsername) {
      setRememberMe(true);
      setValue("username", rememberedUsername);
    }
  }, [setValue]);

  const { mutate: loginMutation, isPending } = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      // Refresh current-user cache (react-query)
      queryClient.invalidateQueries({ queryKey: ["current-user"] });

      if (rememberMe && data.username) {
        localStorage.setItem("rememberedUsername", data.username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }

      // Store whatever came back from login (if any)
      if (data) {
        localStorage.setItem("userData", JSON.stringify(data));
      }

      // helper to parse all shapes of access into an array of allowed permission keys
      const parseAccessToAllowedKeys = (accessRaw: any): string[] => {
        if (!accessRaw) return [];

        // If access is an array-of-things:
        if (Array.isArray(accessRaw) && accessRaw.length > 0) {
          const first = accessRaw[0];
          // If first is a stringified JSON, parse it
          let parsed = first;
          if (typeof first === "string") {
            try {
              parsed = JSON.parse(first);
            } catch {
              parsed = first;
            }
          }

          // If parsed is an object of booleans, collect keys with true
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return Object.entries(parsed)
              .filter(([_, v]) => v === true)
              .map(([k]) => k);
          }

          // If parsed is an array of strings, return as-is
          if (Array.isArray(parsed)) {
            return parsed.map(String);
          }

          // If parsed is a single string (permission), return array with it
          if (typeof parsed === "string") {
            return [parsed];
          }

          return [];
        }

        // If access is an object directly { dashboard: true, ... }
        if (typeof accessRaw === "object" && !Array.isArray(accessRaw)) {
          return Object.entries(accessRaw)
            .filter(([_, v]) => v === true)
            .map(([k]) => k);
        }

        // If access is a single stringified object
        if (typeof accessRaw === "string") {
          try {
            const parsed = JSON.parse(accessRaw);
            if (Array.isArray(parsed)) return parsed.map(String);
            if (typeof parsed === "object") {
              return Object.entries(parsed)
                .filter(([_, v]) => v === true)
                .map(([k]) => k);
            }
          } catch {
            return [accessRaw];
          }
        }

        return [];
      };

      // 1) Try to get allowedPermissions from login response (fast path)
      let allowedPermissions = parseAccessToAllowedKeys(data?.access);

      // 2) If none found, attempt to validateUser() a couple of times (short retry loop)
      if (!allowedPermissions || allowedPermissions.length === 0) {
        let freshUser = null;
        const maxRetries = 2;
        for (let i = 0; i <= maxRetries; i++) {
          try {
            // Ask server for canonical user (validateUser fetches /api/user and persists access)
            freshUser = await validateUser();
          } catch (err) {
            freshUser = null;
          }

          if (freshUser) {
            allowedPermissions = parseAccessToAllowedKeys(freshUser.access);
            if (allowedPermissions && allowedPermissions.length > 0) {
              break;
            }
          }

          // small delay between retries (only if we'll retry)
          if (i < maxRetries) {
            await new Promise((res) => setTimeout(res, 400));
          }
        }
      }

      // Persist canonical permission array used by the rest of the app
      localStorage.setItem("userPermissions", JSON.stringify(allowedPermissions || []));

      // If still empty, show the Unauthorized page (no permissions)
      if (!allowedPermissions || allowedPermissions.length === 0) {
        enqueueSnackbar("No permissions assigned to your account. Please contact administrator.", {
          variant: "warning",
        });
        navigate("/unauthorized");
        return;
      }

      // Navigate based on permissions (teacher -> student -> default dashboard)
      if (allowedPermissions.includes("managementStaffReport")) {
        navigate("/managementStaffReport");
      } else if (allowedPermissions.includes("classTeacherReport")) {
        navigate("/classTeacherReport");
      } else {
        navigate("/parentReport");
      }

      enqueueSnackbar("Welcome Back!", {
        variant: "success",
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "right",
        },
      });
    },
    onError: (error: any) => {
      console.log("Login error:", error);

      setBackendError(null);
      clearErrors();

      let errorMessage = "Login failed. Please try again.";
      const errorData: BackendErrorResponse = error.response?.data || {};

      // Handle network / localhost errors
      if (error.message === "Network Error") {
        errorMessage =
          "Cannot connect to the server. Please check if backend is running on localhost.";
      } else if (typeof errorData === "string") {
        errorMessage = errorData;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }

      // Collect field-specific errors
      const fieldErrors: string[] = [];

      if (errorData.errors) {
        if (errorData.errors.username) {
          setError("username", {
            type: "manual",
            message: errorData.errors.username[0],
          });
          fieldErrors.push(errorData.errors.username[0]);
        }

        if (errorData.errors.password) {
          setError("password", {
            type: "manual",
            message: errorData.errors.password[0],
          });
          fieldErrors.push(errorData.errors.password[0]);
        }

        // If both exist, combine message
        if (fieldErrors.length > 1) {
          errorMessage = fieldErrors.join(" & ");
        } else if (fieldErrors.length === 1) {
          errorMessage = fieldErrors[0];
        }
      }

      setBackendError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: "error" });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setBackendError(null);
    clearErrors();
    loginMutation(data);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const handleForgotPasswordFlow = async () => {
    try {
      const email = window.prompt("Enter your email for password reset:");
      if (!email) {
        enqueueSnackbar("Email is required", { variant: "warning" });
        return;
      }

      await sendForgotPasswordOtp({ email });
      enqueueSnackbar("OTP sent to your email", { variant: "info" });

      const otp = window.prompt("Enter the OTP you received:");
      if (!otp) {
        enqueueSnackbar("OTP is required", { variant: "warning" });
        return;
      }

      await verifyForgotPasswordOtp({ email, otp });
      enqueueSnackbar("OTP verified. Please set your new password.", { variant: "success" });

      const password = window.prompt("New password (min 6 chars):");
      if (!password || password.length < 6) {
        enqueueSnackbar("Password must be at least 6 characters", { variant: "warning" });
        return;
      }

      const password_confirmation = window.prompt("Confirm new password:");
      if (password_confirmation !== password) {
        enqueueSnackbar("Passwords do not match", { variant: "error" });
        return;
      }

      await resetForgotPassword({ email, password, password_confirmation });
      enqueueSnackbar("Password reset successful. You may now sign in.", { variant: "success" });
    } catch (err: any) {
      enqueueSnackbar(err?.message || "Forgot password flow failed", { variant: "error" });
    }
  };

  return (
    <Box 
      sx={{ 
        width: "100%", 
        maxWidth: 500,
        px: { xs: 2, sm: 3 },
        mx: "auto"
      }}
    >
      <CardContent 
        sx={{ 
          textAlign: "center",
          px: { xs: 1, sm: 3 },
          py: { xs: 2, sm: 3 }
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img 
            src="/images/schoolLogo.png" 
            alt="School Logo" 
            style={{
              width: "50px",
              maxWidth: "100%"
            }}
          />
          <Typography 
            variant="subtitle1" 
            fontWeight="bold"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" }
            }}
          >
            Student Management System
          </Typography>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            mt={1}
            sx={{ 
              textAlign: "left",
              fontSize: { xs: "1.125rem", sm: "1.25rem" }
            }}
          >
            Sign In
          </Typography>
        </motion.div>
      </CardContent>

      {backendError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: "10px",
              alignItems: "center",
              fontSize: { xs: "0.813rem", sm: "0.875rem" }
            }}
            onClose={() => setBackendError(null)}
          >
            {backendError}
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Username"
          fullWidth
          variant="outlined"
          margin="normal"
          {...register("username", {
            required: "Username is required",
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
          })}
          error={!!errors.username}
          helperText={errors.username?.message}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              height: { xs: "50px", sm: "55px" },
            },
            "& .MuiInputLabel-root": {
              fontSize: { xs: "0.875rem", sm: "1rem" }
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" }
            },
            "& .MuiFormHelperText-root": {
              fontSize: { xs: "0.75rem", sm: "0.813rem" }
            }
          }}
          autoComplete="username"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle
                  color={errors.username ? "error" : "action"}
                  sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          fullWidth
          variant="outlined"
          margin="normal"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 6,
              message: "Password must be at least 6 characters",
            },
          })}
          error={!!errors.password}
          helperText={errors.password?.message}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              height: { xs: "50px", sm: "55px" },
            },
            "& .MuiInputLabel-root": {
              fontSize: { xs: "0.875rem", sm: "1rem" }
            },
            "& .MuiInputBase-input": {
              fontSize: { xs: "0.875rem", sm: "1rem" }
            },
            "& .MuiFormHelperText-root": {
              fontSize: { xs: "0.75rem", sm: "0.813rem" }
            }
          }}
          autoComplete="current-password"
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock
                  color={
                    errors.password
                      ? "error"
                      : passwordFocused
                      ? "primary"
                      : "action"
                  }
                  sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                  size="small"
                >
                  {showPassword ? (
                    <VisibilityOff sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                  ) : (
                    <Visibility sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              Remember me
            </Typography>
          }
          sx={{ mb: 2 }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isPending}
          sx={{
            mb: 2,
            height: { xs: 44, sm: 48 },
            borderRadius: "9px",
            fontSize: { xs: "0.938rem", sm: "1rem" },
            fontWeight: "bold",
            textTransform: "none",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            "&:hover": {
              boxShadow: "0 6px 8px rgba(0, 0, 0, 0.15)",
            },
          }}
        >
          {isPending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Sign In"
          )}
        </Button>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 1, sm: 0 },
            mt: 2,
          }}
        >
          <Button
            startIcon={<Info sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }} />}
            onClick={onForgotPasswordClick ?? handleForgotPasswordFlow}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              fontSize: { xs: "0.813rem", sm: "0.875rem" },
              justifyContent: { xs: "center", sm: "flex-start" },
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            Forgot password?
          </Button>
          <Link to="/register" style={{ textDecoration: "none" }}>
            <Button
              startIcon={<AccountCircle sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }} />}
              sx={{
                textTransform: "none",
                color: "primary.main",
                fontSize: { xs: "0.813rem", sm: "0.875rem" },
                width: { xs: "100%", sm: "auto" },
                "&:hover": {
                  color: "primary.dark",
                },
              }}
            >
              Create account
            </Button>
          </Link>
        </Box>
      </form>
    </Box>
  );
};

export default LoginForm;