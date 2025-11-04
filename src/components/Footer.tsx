
import { Box, Typography, useTheme } from '@mui/material';

const Footer = () => {
  const theme = useTheme();
  return (
    <Box sx={{ py: 2, textAlign: 'center', bgcolor: theme.palette.background.paper }}>
      <Typography variant="body2" color="textSecondary">
        © 2025 SkyTech SL. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
