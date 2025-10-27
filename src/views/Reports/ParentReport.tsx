import React, { useState, useEffect } from "react";
import {
    Box,
    CssBaseline,
    AppBar,
    Stack,
    Typography,
    Paper,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
} from "@mui/material";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip as ReTooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from "dayjs";

import {
    fetchParentReport,
    fetchChildrenList,
    type ParentReportData,
    type ChildDetails,
    type DetailedMarksTableRow
} from "../../api/parentApi.ts";

// Standardize the Monthly Exam value to 'Monthly'
const MONTHLY_EXAM_VALUE = 'Monthly';

const examOptions = [
    { label: 'First Term', value: 'First' },
    { label: 'Second Term', value: 'Mid' },
    { label: 'Third Term', value: 'End' },
    { label: 'Monthly Test', value: MONTHLY_EXAM_VALUE }
];

const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#9C27B0", "#FF5722", "#00BCD4"];

const ParentReport: React.FC = () => {
    const theme = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [exam, setExam] = useState("");
    const [month, setMonth] = useState("");
    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);

    type SnackbarState = {
        open: boolean;
        message: string;
        severity: "success" | "info" | "warning" | "error";
    };
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

    // Clear month when exam is not "Monthly"
    useEffect(() => {
        if (exam !== MONTHLY_EXAM_VALUE) {
            setMonth("");
        }
    }, [exam]);

    const hasValidFilters = (): boolean => {
        const hasExamFilter = Boolean(exam);
        const hasDateFilter = Boolean(startDate && endDate && startDate.isValid() && endDate.isValid());
        return hasExamFilter || hasDateFilter;
    };

    // Fetch list of all children for this parent
    const {
        isLoading: isLoadingChildren,
        isError: isErrorChildren,
        error: errorChildren,
        data: childrenData
    } = useQuery<ChildDetails[], Error>({
        queryKey: ["children-list"],
        queryFn: fetchChildrenList,
        retry: 1,
    });

    // Get currently selected child
    const selectedChild = childrenData?.[selectedChildIndex];

    // Reset selected child index if children data changes
    useEffect(() => {
        if (childrenData && childrenData.length > 0 && selectedChildIndex >= childrenData.length) {
            setSelectedChildIndex(0);
        }
    }, [childrenData, selectedChildIndex]);

    // Fetches report data for the selected child
    const {
        data: reportData,
        isLoading: isLoadingReport,
        isError: isErrorReport,
        error: errorReport
    } = useQuery<ParentReportData, Error>({
        queryKey: [
            "parent-report",
            startDate?.format('YYYY-MM-DD') || '',
            endDate?.format('YYYY-MM-DD') || '',
            exam,
            month,
            selectedChild?.admissionNo || ''
        ],
        queryFn: () => {
            const admissionNo = selectedChild?.admissionNo;
            const studentGrade = selectedChild?.grade;
            const studentClass = selectedChild?.className;

            if (!admissionNo || !studentGrade || !studentClass) {
                throw new Error("Student information not available");
            }

            const startDateValue = startDate?.format('YYYY-MM-DD') || '2024-01-01';
            const endDateValue = endDate?.format('YYYY-MM-DD') || '2024-12-31';
            const examValue = exam || 'First';
            const monthValue = exam === MONTHLY_EXAM_VALUE ? month : "";

            return fetchParentReport(
                admissionNo,
                startDateValue,
                endDateValue,
                examValue,
                monthValue,
                studentGrade,
                studentClass
            );
        },
        enabled: Boolean(selectedChild?.admissionNo) && hasValidFilters(),
        retry: 1
    });

    // Handle side effects for errors
    useEffect(() => {
        if (isErrorChildren && errorChildren) {
            setSnackbar({
                open: true,
                message: `Failed to load children list: ${errorChildren.message}`,
                severity: "error"
            });
        }
        if (isErrorReport && errorReport) {
            setSnackbar({
                open: true,
                message: `Failed to load report data: ${errorReport.message}`,
                severity: "error"
            });
        }
    }, [isErrorChildren, errorChildren, isErrorReport, errorReport]);

    useEffect(() => {
        if (startDate && endDate &&
            startDate.isValid() && endDate.isValid() &&
            startDate.isAfter(endDate)) {
            setSnackbar({
                open: true,
                message: "Start date cannot be after end date",
                severity: "warning"
            });
            setEndDate(null);
        }
    }, [startDate, endDate]);

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const renderDetailedMarksTable = (): React.ReactNode => {
        if (isLoadingReport) {
            return (
                <TableRow>
                    <TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
            );
        }

        if (!reportData || !reportData.studentMarksDetailedTable || reportData.studentMarksDetailedTable.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} align="center">No detailed marks available for this period.</TableCell>
                </TableRow>
            );
        }

        const rowsWithMarks = reportData.studentMarksDetailedTable.filter(row => row.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const averageMarks = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'N/A';

        const rows = reportData.studentMarksDetailedTable.map((row: DetailedMarksTableRow, idx: number) => (
            <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{row.subject}</TableCell>
                <TableCell align="center">{row.highestMarks}</TableCell>
                <TableCell align="center">{row.highestMarkGrade}</TableCell>
                <TableCell align="center">{row.studentMarks > 0 ? row.studentMarks : 'N/A'}</TableCell>
                <TableCell align="center">{row.studentGrade !== 'N/A' ? row.studentGrade : 'N/A'}</TableCell>
            </TableRow>
        ));

        if (rowsWithMarks.length > 0) {
            rows.push(
                <TableRow sx={{ backgroundColor: theme.palette.action.hover }} key="average-row">
                    <TableCell sx={{ fontWeight: 'bold' }}>Overall Average</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center">{averageMarks}</TableCell>
                    <TableCell align="center"></TableCell>
                </TableRow>
            );
        }
        return rows;
    };

    const renderSubjectAverageCharts = () => {
        if (isLoadingReport) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, width: '100%' }}>
                    <CircularProgress />
                </Box>
            );
        }

        const individualSubjectAverages = reportData?.individualSubjectAverages;

        if (!individualSubjectAverages || Object.keys(individualSubjectAverages).length === 0) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, width: '100%' }}>
                    <Typography variant="h6" color="text.secondary">No subject average data available.</Typography>
                </Box>
            );
        }

        const subjects = Object.keys(individualSubjectAverages);
        const subjectRows = [];
        for (let i = 0; i < subjects.length; i += 3) {
            subjectRows.push(subjects.slice(i, i + 3));
        }

        return (
            <Stack spacing={3}>
                {subjectRows.map((row, rowIndex) => (
                    <Stack key={rowIndex} direction={{ xs: 'column', md: 'row' }} spacing={3}>
                        {row.map((subjectName) => (
                            <Paper key={subjectName} sx={{ p: 3, flex: 1, minWidth: 0 }}>
                                <Typography fontWeight={600} mb={2}>{subjectName} Subject</Typography>
                                <ResponsiveContainer width="100%" height={250}>
                                    {individualSubjectAverages[subjectName] && individualSubjectAverages[subjectName]!.length > 0 ? (
                                        <LineChart data={individualSubjectAverages[subjectName]}>
                                            <XAxis dataKey="x" />
                                            <YAxis domain={[0, 100]} label={{ value: 'Marks', angle: -90, position: 'insideLeft' }} />
                                            <ReTooltip />
                                            <Line type="monotone" dataKey="y" stroke="#42A5F5" name="Average Marks" />
                                        </LineChart>
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                            <Typography variant="body2" color="text.secondary">No data for {subjectName}</Typography>
                                        </Box>
                                    )}
                                </ResponsiveContainer>
                            </Paper>
                        ))}
                        {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                            <Box key={`empty-${rowIndex}-${emptyIndex}`} sx={{ flex: 1 }} />
                        ))}
                    </Stack>
                ))}
            </Stack>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh" }}>
                <CssBaseline />
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                <Box sx={{ flexGrow: 1, overflowX: 'hidden' }}>
                    <AppBar position="static" sx={{
                        boxShadow: "none", bgcolor: theme.palette.background.paper,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                    }}>
                        <Navbar title="Parent Report" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    </AppBar>

                    <Stack spacing={3} sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                        {/* Single row for Filters and Student Details */}
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch" sx={{ width: '100%' }}>
                            {/* Filter Section */}
                            <Paper elevation={2} sx={{ p: 3, flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Report Filters
                                </Typography>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    alignItems="flex-start"
                                    flexWrap="wrap"
                                    useFlexGap={true}
                                >
                                    {/* Start Date */}
                                    <TextField
                                        type="date"
                                        label="Start Date"
                                        value={startDate ? startDate.format('YYYY-MM-DD') : ''}
                                        onChange={(e) => setStartDate(e.target.value ? dayjs(e.target.value) : null)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ minWidth: { xs: '100%', sm: 150 } }}
                                    />
                                    {/* End Date */}
                                    <TextField
                                        type="date"
                                        label="End Date"
                                        value={endDate ? endDate.format('YYYY-MM-DD') : ''}
                                        onChange={(e) => setEndDate(e.target.value ? dayjs(e.target.value) : null)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ minWidth: { xs: '100%', sm: 150 } }}
                                    />
                                    {/* Exam */}
                                    <TextField
                                        select
                                        label="Exam"
                                        value={exam}
                                        onChange={e => setExam(e.target.value)}
                                        sx={{ minWidth: { xs: '100%', sm: 150 } }}
                                    >
                                        {examOptions.map((examOption) => (
                                            <MenuItem key={examOption.value} value={examOption.value}>
                                                {examOption.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    {/* Month - Only enabled when Monthly exam is selected */}
                                    <TextField
                                        select
                                        label="Month"
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        disabled={exam !== MONTHLY_EXAM_VALUE}
                                        sx={{
                                            minWidth: { xs: '100%', sm: 150 },
                                            opacity: exam !== MONTHLY_EXAM_VALUE ? 0.6 : 1
                                        }}
                                        helperText={exam !== MONTHLY_EXAM_VALUE ? "Available only for Monthly exams" : ""}
                                    >
                                        {months.map(m => (
                                            <MenuItem key={m} value={m}>{m}</MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Paper>

                            {/* Student Details Section */}
                            <Paper elevation={2} sx={{ p: 3, flexShrink: 0, minWidth: { xs: '100%', md: 300 } }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Student Details
                                </Typography>
                                
                                {/* Child Selection Dropdown - Only show if multiple children */}
                                {!isLoadingChildren && childrenData && childrenData.length > 1 && (
                                    <TextField
                                        select
                                        label="Select Child"
                                        value={selectedChildIndex}
                                        onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
                                        fullWidth
                                        sx={{ mb: 2 }}
                                    >
                                        {childrenData.map((child, index) => (
                                            <MenuItem key={index} value={index}>
                                                {child.studentName} - {child.admissionNo}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}

                                <Box sx={{
                                    p: 2,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: theme.shape.borderRadius,
                                    textAlign: 'left'
                                }}>
                                    {isLoadingChildren ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <CircularProgress size={20} />
                                            <Typography>Loading...</Typography>
                                        </Box>
                                    ) : selectedChild ? (
                                        <Stack spacing={1}>
                                            <Typography variant="body2" fontWeight="bold">
                                                Student: {selectedChild.studentName}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Grade: {selectedChild.grade}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Class: {selectedChild.className}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Admission No: {selectedChild.admissionNo}
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No student data available
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        </Stack>

                        {/* Show message if no valid filters */}
                        {!hasValidFilters() && (
                            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Please select the filters to view report data
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Choose either an exam (and month) or select a date range to load the report.
                                </Typography>
                            </Paper>
                        )}

                        {/* Charts and Data - Only show if valid filters are applied */}
                        {hasValidFilters() && selectedChild && (
                            <>
                                {/* Charts Section */}
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} flexWrap="wrap">
                                    {/* Overall Subject Bar Chart */}
                                    <Paper sx={{ p: 3, flex: 2 }}>
                                        <Typography fontWeight={600} mb={2}>Overall Subject</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            {isLoadingReport ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : (
                                                <BarChart data={reportData?.overallSubjectLineGraph} barSize={50}>
                                                    <XAxis dataKey="year" />
                                                    <YAxis domain={[0, 100]} />
                                                    <ReTooltip />
                                                    <Bar dataKey="firstTerm" fill="#0d1542ff" name="First Term" />
                                                    <Bar dataKey="secondTerm" fill="#1310b6ff" name="Second Term" />
                                                    <Bar dataKey="thirdTerm" fill=" #77aef5ff" name="Third Term" />
                                                </BarChart>
                                            )}
                                        </ResponsiveContainer>
                                    </Paper>

                                    {/* Subject Wise Marks (Pie Chart) */}
                                    <Paper sx={{ p: 3, flex: 1 }}>
                                        <Typography fontWeight={600} mb={2}>Subject Wise Marks.</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            {isLoadingReport ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : (
                                                <PieChart>
                                                    <Pie
                                                        data={reportData?.subjectWiseMarksPie}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        outerRadius={80}
                                                        label={(entry: any) => entry.name}
                                                    >
                                                        {(reportData?.subjectWiseMarksPie || []).map((_: any, idx: number) => (
                                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <ReTooltip />
                                                    <Legend />
                                                </PieChart>
                                            )}
                                        </ResponsiveContainer>
                                    </Paper>
                                </Stack>

                                {renderSubjectAverageCharts()}

                                {/* Detailed Marks Table */}
                                <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
                                    <Typography variant="h6" fontWeight={600} mb={2}>
                                        Detailed Marks Breakdown
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell rowSpan={2} sx={{ fontWeight: 'bold', minWidth: 100 }}>Subject</TableCell>
                                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>Highest Student</TableCell>
                                                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>{selectedChild?.studentName || 'Student'}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 70 }}>Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 70 }}>Mark Grade</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 70 }}>Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 70 }}>Mark Grade</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {renderDetailedMarksTable()}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </>
                        )}
                    </Stack>
                    <Footer />
                </Box>
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default ParentReport;