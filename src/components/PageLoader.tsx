import { Box, CircularProgress, Typography } from '@mui/material';

const PageLoader = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: '100%',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // semi-transparent white background
        zIndex: theme => theme.zIndex.drawer + 1 // ensure it's above other content
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{
            color: theme => theme.palette.primary.main
          }}
        />
        <Typography 
          variant="h6" 
          sx={{
            color: theme => theme.palette.text.primary,
            fontWeight: 500
          }}
        >
          Loading...
        </Typography>
      </Box>
    </Box>
  );
};

export default PageLoader;