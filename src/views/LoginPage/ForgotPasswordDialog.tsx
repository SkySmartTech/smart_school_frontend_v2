import { useState, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword } from "../../api/userApi";

interface ForgotPasswordDialogProps {
  open: boolean;
  handleClose: () => void;
}

const ForgotPasswordDialog = ({ open, handleClose }: ForgotPasswordDialogProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [step, setStep] = useState<"email" | "verify" | "reset">("email");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // countdown state and ref
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const resetState = () => {
    setEmail("");
    setOtp("");
    setPassword("");
    setPasswordConfirmation("");
    setStep("email");
    setError(null);
    setIsPending(false);
    setRemainingSeconds(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCloseInternal = () => {
    resetState();
    handleClose();
  };

  const startCountdown = (seconds: number) => {
    // clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingSeconds(seconds);

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          // timer expired
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setError("OTP expired. Please request a new OTP.");
          setStep("email");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ensure timer is cleared when step changes or component unmounts
  useEffect(() => {
    if (step !== "verify") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    // if entering verify step and there's no active timer, start 3 minutes
    if (!timerRef.current && remainingSeconds === 0) {
      startCountdown(180); 
    }
    return () => {
      // cleanup on unmount or step change
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // helper to format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

const handleSendOtp = async () => {
  setError(null);
  if (!email) {
    setError("Email is required");
    return;
  }

  setIsPending(true);
  try {
    await sendForgotPasswordOtp({ email });
    enqueueSnackbar("OTP sent to your email", { variant: "info" });
    setStep("verify");
    // reset and start countdown whenever OTP is (re)sent (3 minutes = 180 seconds)
    startCountdown(180);
  } catch (err: any) {
    setError(err?.message || "Failed to send OTP");
  } finally {
    setIsPending(false);
  }
};

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otp) {
      setError("OTP is required");
      return;
    }

    setIsPending(true);
    try {
      await verifyForgotPasswordOtp({ email, otp });
      enqueueSnackbar("OTP verified. Please set your new password.", { variant: "success" });
      setStep("reset");
      // clear timer after successful verification
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRemainingSeconds(0);
    } catch (err: any) {
      setError(err?.message || "OTP verification failed");
    } finally {
      setIsPending(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }

    setIsPending(true);
    try {
      await resetForgotPassword({ email, password, password_confirmation: passwordConfirmation });
      enqueueSnackbar("Password reset successful. You may now sign in.", { variant: "success" });
      handleCloseInternal();
    } catch (err: any) {
      setError(err?.message || "Password reset failed");
    } finally {
      setIsPending(false);
    }
  };

  const primaryActionLabel = step === "email" ? "Send OTP" : step === "verify" ? "Verify OTP" : "Reset Password";
  const handlePrimaryAction = step === "email" ? handleSendOtp : step === "verify" ? handleVerifyOtp : handleResetPassword;

  return (
    <Dialog open={open} onClose={handleCloseInternal} fullWidth maxWidth="xs">
      <DialogTitle>
        {/* DialogTitle already renders an H2. keep text non-heading to avoid nested heading tags */}
        <Typography variant="h6" component="div" fontWeight="bold">
          Forgot Password
        </Typography>
      </DialogTitle>

      <DialogContent>
        {step === "email" && (
          <>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enter your email address below and we'll send an OTP to reset your password.
            </Typography>
            <TextField
              fullWidth
              label="Email Address"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
          </>
        )}

        {step === "verify" && (
          <>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enter the OTP you received in your email.
            </Typography>
            <TextField
              fullWidth
              label="OTP"
              variant="outlined"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Time remaining: {formatTime(remainingSeconds)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              
            </Typography>
          </>
        )}

        {step === "reset" && (
          <>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Set your new password.
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              variant="outlined"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              sx={{ mb: 1 }}
              autoComplete="new-password"
            />
          </>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCloseInternal} color="secondary" disabled={isPending}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="primary"
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={18} color="inherit" /> : null}
          onClick={handlePrimaryAction}
        >
          {isPending ? "Please wait..." : primaryActionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForgotPasswordDialog;