import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Divider,
    Stack,
    CssBaseline,
    useTheme,
    AppBar,
    Button,
    ButtonGroup
} from '@mui/material';
import {
    MenuBook as MenuBookIcon,
    HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useCustomTheme } from '../context/ThemeContext';

interface ManualLinkProps {
    title: string;
    description: string;
    pdfUrl: {
        english: string;
        sinhala: string;
    };
}

const ManualLink: React.FC<ManualLinkProps> = ({ title, description, pdfUrl }) => {
    const theme = useTheme();

    const handleClick = (language: 'english' | 'sinhala') => {
        // Open PDF in new tab based on selected language
        window.open(pdfUrl[language], '_blank');
    };

    return (
        <Box
            sx={{
                width: '100%',
                p: 2,
                borderRadius: theme.shape.borderRadius,
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
                transition: 'background-color 0.2s',
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
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
                <ButtonGroup variant="outlined" size="small">
                    <Button 
                        onClick={() => handleClick('sinhala')}
                        sx={{ minWidth: '80px' }}
                    >
                        සිංහල
                    </Button>
                    <Button 
                        onClick={() => handleClick('english')}
                        sx={{ minWidth: '80px' }}
                    >
                        English
                    </Button>
                </ButtonGroup>
            </Stack>
        </Box>
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
            pdfUrl: {
                english: "/src/assets/usermanuals/english_user_manual_parent.pdf",
                sinhala: "/src/assets/usermanuals/sinhala_user_manual_parent.pdf"
            }
        },
        {
            title: "Student's Manual",
            description: "Instructions for students on accessing lessons and checking homework.",
            pdfUrl: {
                english: "/src/assets/usermanuals/english_user_manual_student.pdf",
                sinhala: "/src/assets/usermanuals/sinhala_user_manual_student.pdf"
            }
        },
        {
            title: "Teacher's Manual",
            description: "Detailed guide for teachers on grading, attendance, and content management.",
            pdfUrl: {
                english: "/src/assets/usermanuals/english_user_manual_teacher.pdf",
                sinhala: "/src/assets/usermanuals/sinhala_user_manual_teacher.pdf"
            }
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
                        title="Help Page"
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