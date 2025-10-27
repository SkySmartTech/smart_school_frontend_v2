import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Divider,
    Link as MuiLink,
    Stack,
    CssBaseline,
    useTheme,
    AppBar
} from '@mui/material';
import {
    MenuBook as MenuBookIcon,
    ArrowForwardIos as ArrowForwardIosIcon,
    HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useCustomTheme } from '../context/ThemeContext';

interface ManualLinkProps {
    title: string;
    description: string;
    pdfUrl: string; 
}

const ManualLink: React.FC<ManualLinkProps> = ({ title, description, pdfUrl }) => {
    const theme = useTheme();

    const handleClick = () => {
        // Open PDF in new tab
        window.open(pdfUrl, '_blank');
    };

    return (
        <MuiLink
            component="button"
            onClick={handleClick}
            sx={{
                width: '100%',
                textAlign: 'left',
                p: 2,
                borderRadius: theme.shape.borderRadius,
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    textDecoration: 'none',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: theme.palette.text.primary,
                transition: 'background-color 0.2s',
            }}
            underline="none"
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <MenuBookIcon color="primary" />
                <Box>
                    <Typography variant="body1" fontWeight={600} color="text.primary">
                        {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {description}
                    </Typography>
                </Box>
            </Stack>
            <ArrowForwardIosIcon sx={{ fontSize: 'small', color: theme.palette.text.secondary }} />
        </MuiLink>
    );
};

const HelpPage: React.FC = () => {
    const theme = useTheme();
    useCustomTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const manuals = [
        {
            title: "Parent's Manual",
            description: "Guide for parents on viewing reports and interacting with the system.",
            pdfUrl: "/manuals/parent's manual.pdf"
        },
        {
            title: "Student's Manual",
            description: "Instructions for students on accessing lessons and checking homework.",
            pdfUrl: "/manuals/student's manual.pdf"
        },
        {
            title: "Teacher's Manual",
            description: "Detailed guide for teachers on grading, attendance, and content management.",
            pdfUrl: "/manuals/teacher's manual.pdf"
        },
    ];

    return (
        <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh" }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <AppBar
                    position="static"
                    sx={{
                        bgcolor: 'background.paper',
                        boxShadow: 'none',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        zIndex: theme.zIndex.drawer + 1,
                        color: theme.palette.text.primary
                    }}
                >
                    <Navbar
                        title="Help & Manuals"
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />
                </AppBar>

                <Box
                    sx={{
                        p: 3,
                        flexGrow: 1,
                        overflow: "auto",
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        backgroundColor: theme.palette.background.default,
                    }}
                >
                    <Paper
                        elevation={2}
                        sx={{
                            p: 4,
                            width: { xs: '95%', sm: 600, md: 700 },
                            borderRadius: 2,
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                            <HelpOutlineIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                            <Typography variant="h5" fontWeight={700}>
                                System Manuals
                            </Typography>
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        <Stack spacing={1}>
                            {manuals.map((manual, index) => (
                                <React.Fragment key={manual.title}>
                                    <ManualLink
                                        title={manual.title}
                                        description={manual.description}
                                        pdfUrl={manual.pdfUrl}
                                    />
                                    {index < manuals.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </Stack>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

export default HelpPage;
