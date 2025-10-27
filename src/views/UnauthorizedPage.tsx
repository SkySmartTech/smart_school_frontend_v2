import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import logo from "/images/schoolLogo.png" 

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const WelcomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 6,
            textAlign: 'center',
            animation: `${fadeIn} 1s ease-in-out`,
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255,255,255,0.9)',
          }}
        >
          {/* ✅ School Logo Section */}
          <Box
            component="img"
            src={logo}
            alt="School Logo"
            sx={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              mb: 2,
              animation: `${fadeIn} 1s ease-in-out`,
            }}
          />

          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.dark,
              mb: 1,
            }}
          >
            Welcome to The Smart School
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 4,
            }}
          >
            Manage your school operations efficiently with our modern School Management System.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
            sx={{
              px: 5,
              py: 1.5,
              fontSize: '1.1rem',
              borderRadius: 3,
              textTransform: 'none',
              transition: '0.3s',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            Click Here to Continue
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default WelcomePage;
