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
    Button,
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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import {
    fetchParentReport,
    fetchChildrenList,
    fetchYears,
    type ParentReportData,
    type ChildDetails,
    type DetailedMarksTableRow,
    type YearOption
} from "../../api/parentApi.ts";

// Standardize the Monthly Exam value to 'Monthly'
const MONTHLY_EXAM_VALUE = 'Monthly';

const examOptions = [
    { label: 'First Term', value: 'First Term' },
    { label: 'Second Term', value: 'Second Term' },
    { label: 'Third Term', value: 'Third Term' },
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
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [yearOptions, setYearOptions] = useState<YearOption[]>([]);
    const [yearOptionsLoading, setYearOptionsLoading] = useState(false);
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

    // Fetch years on component mount
    useEffect(() => {
        const loadYears = async () => {
            setYearOptionsLoading(true);
            try {
                const years = await fetchYears();
                setYearOptions(years);
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: `Failed to load years: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: "error"
                });
            } finally {
                setYearOptionsLoading(false);
            }
        };
        loadYears();
    }, []);

    const hasValidFilters = (): boolean => {
        return Boolean(exam && startYear && endYear);
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
            startYear,
            endYear,
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

            const examValue = exam || 'First';
            const monthValue = exam === MONTHLY_EXAM_VALUE ? month : "";

            return fetchParentReport(
                admissionNo,
                startYear,
                endYear,
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

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const exportToExcel = () => {
        if (!reportData || !reportData.studentMarksDetailedTable) return;

        // Resolve student details with fallbacks (reportData -> selectedChild -> N/A)
        const studentName = reportData.studentName || selectedChild?.studentName || 'Absent';
        const studentGrade = reportData.studentGrade || selectedChild?.grade || 'Absent';
        const studentClass = reportData.studentClass || selectedChild?.className || 'Absent';
        const admissionNo = selectedChild?.admissionNo || (reportData as any).studentAdmissionNo || 'Absent';

        // Prepare a students_info summary (all children) if available
        const studentsInfoList = childrenData && childrenData.length > 0
            ? childrenData.map(c => `${c.studentName || 'Absent'} (${c.admissionNo || 'Absent'})`).join(' ; ')
            : 'Absent';

        // Calculate overall average (same logic as the table rendering)
        const rowsWithMarks = reportData.studentMarksDetailedTable.filter((r: DetailedMarksTableRow) => r.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const overallAverage = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'Absent';

        // Build AOAs: header metadata + table header + table rows
        const headerAoA: Array<Array<string>> = [
           
            ['Grade', studentGrade],
            ['Class', studentClass],
            ['Admission No', admissionNo],
            ['Students', studentsInfoList],
            ['Year', reportData.currentYear ? String(reportData.currentYear) : 'Absent'],
            ['Term', reportData.currentTerm || 'Absent'],
            ['Overall Average', String(overallAverage)]
        ];

        const tableHeader = ['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade'];

        const tableRows = reportData.studentMarksDetailedTable.map(row => ([
            row.subject,
            String(row.highestMarks),
            row.highestMarkGrade,
            row.studentMarks > 0 ? String(row.studentMarks) : 'Absent',
            row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'
        ]));

        const combinedAoA: Array<Array<string>> = [
            ...headerAoA,
            [],
            tableHeader,
            ...tableRows,
        ];

        const ws = XLSX.utils.aoa_to_sheet(combinedAoA);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Performance');

        // Filename fallback
        const fileNameBase = (studentName && studentName !== 'Absent') ? studentName : 'Student';
        XLSX.writeFile(wb, `${fileNameBase}_Performance_${new Date().toISOString().split('T')[0]}.xlsx`);

        setSnackbar({ open: true, message: 'Report exported to Excel successfully', severity: 'success' });
    };

    const exportToPDF = () => {
        if (!reportData || !reportData.studentMarksDetailedTable) return;

        // Resolve student details with fallbacks (reportData -> selectedChild -> N/A)
        const studentName = reportData.studentName || selectedChild?.studentName || 'Absent';
        const studentGrade = reportData.studentGrade || selectedChild?.grade || 'Absent';
        const studentClass = reportData.studentClass || selectedChild?.className || 'Absent';
        const admissionNo = selectedChild?.admissionNo || (reportData as any).studentAdmissionNo || 'Absent';

        // Prepare a students_info summary (all children) if available
        const studentsInfoList = childrenData && childrenData.length > 0
            ? childrenData.map(c => `${c.studentName || 'Absent'} (${c.admissionNo || 'Absent'})`).join('\n')
            : 'Absent';

        // Calculate overall average
        const rowsWithMarks = reportData.studentMarksDetailedTable.filter((r: DetailedMarksTableRow) => r.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const overallAverage = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'Absent';

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Add title
        doc.setFontSize(16);
        doc.text('Students Performance Report', pageWidth / 2, 15, { align: 'center' });

        // Add student and report info
        doc.setFontSize(11);
        let yPosition = 25;
        doc.text(`Student: ${studentName}`, 14, yPosition);
        yPosition += 7;
        doc.text(`Grade: ${studentGrade} | Class: ${studentClass} | Admission No: ${admissionNo}`, 14, yPosition);
        yPosition += 7;
        doc.text(`Year: ${reportData.currentYear || 'Absent'} | Term: ${reportData.currentTerm || 'Absent'} | Overall Average: ${overallAverage}`, 14, yPosition);
        yPosition += 8;

        // If multiple children, add the students_info list
        if (studentsInfoList !== 'Absent') {
            doc.setFontSize(10);
            doc.text('Students:', 14, yPosition);
            yPosition += 6;
            const splitLines = doc.splitTextToSize(studentsInfoList, pageWidth - 28);
            doc.text(splitLines, 14, yPosition);
            yPosition += (splitLines.length * 6) + 4;
        }

        // Prepare table data
        const tableData = reportData.studentMarksDetailedTable.map(row => [
            row.subject,
            row.highestMarks.toString(),
            row.highestMarkGrade,
            row.studentMarks > 0 ? row.studentMarks.toString() : 'Absent',
            row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'
        ]);

        // Add table
        autoTable(doc, {
            head: [['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade']],
            body: tableData,
            startY: yPosition,
            margin: { top: 10, right: 14, bottom: 14, left: 14 },
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [13, 21, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { textColor: [51, 51, 51] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
        });

        const fileNameBase = (studentName && studentName !== 'Absent') ? studentName : 'Student';
        doc.save(`${fileNameBase}_Performance_${new Date().toISOString().split('T')[0]}.pdf`);

        setSnackbar({ open: true, message: 'Report exported to PDF successfully', severity: 'success' });
    };

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
                    <TableCell colSpan={5} align="center">Marks have not been added to the subjects yet. Please check after submitting the marks.</TableCell>
                </TableRow>
            );
        }

        const rowsWithMarks = reportData.studentMarksDetailedTable.filter(row => row.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const averageMarks = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'Absent';

        const rows = reportData.studentMarksDetailedTable.map((row: DetailedMarksTableRow, idx: number) => (
            <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{row.subject}</TableCell>
                <TableCell align="center">{row.highestMarks}</TableCell>
                <TableCell align="center">{row.highestMarkGrade}</TableCell>
                <TableCell align="center">{row.studentMarks > 0 ? row.studentMarks : 'Absent'}</TableCell>
                <TableCell align="center">{row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'}</TableCell>
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
                                sx={{ width: '100%', mb: 3 }}
                                justifyContent={{ xs: 'stretch', sm: 'space-between' }}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                            >
                                {/* Start Year */}
                                <TextField
                                    select
                                    label="Start Year"
                                    value={startYear}
                                    onChange={(e) => setStartYear(e.target.value)}
                                    disabled={yearOptionsLoading}
                                    sx={{ 
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 250 }
                                    }}
                                >
                                    {yearOptions.map((yearOption) => (
                                        <MenuItem key={yearOption.id} value={yearOption.year}>
                                            {yearOption.year}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                {/* End Year */}
                                <TextField
                                    select
                                    label="End Year"
                                    value={endYear}
                                    onChange={(e) => setEndYear(e.target.value)}
                                    disabled={yearOptionsLoading}
                                    sx={{ 
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 250 }
                                    }}
                                >
                                    {yearOptions.map((yearOption) => (
                                        <MenuItem key={yearOption.id} value={yearOption.year}>
                                            {yearOption.year}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                {/* Exam */}
                                <TextField
                                    select
                                    label="Exam"
                                    value={exam}
                                    onChange={e => setExam(e.target.value)}
                                    sx={{ 
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 250 }
                                    }}
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
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 250 },
                                        opacity: exam !== MONTHLY_EXAM_VALUE ? 0.6 : 1
                                    }}
                                  
                                >
                                    {months.map(m => (
                                        <MenuItem key={m} value={m}>{m}</MenuItem>
                                    ))}
                                </TextField>
                            </Stack>

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
                                Choose an exam and select start/end year range to load the report.
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
                                    <Typography fontWeight={600} mb={2}>
                                        {exam === MONTHLY_EXAM_VALUE ? `${exam} - ${month}` : exam} Performance
                                    </Typography>
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
                                                {exam === 'First Term' || exam === '' ? (
                                                    <Bar dataKey="firstTerm" fill="#0d1542ff" name="First Term" />
                                                ) : exam === 'Second Term' ? (
                                                    <Bar dataKey="secondTerm" fill="#1310b6ff" name="Second Term" />
                                                ) : exam === 'Third Term' ? (
                                                    <Bar dataKey="thirdTerm" fill="#77aef5ff" name="Third Term" />
                                                ) : null}
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </Paper>

                                {/* Subject Wise Marks (Pie Chart) */}
                                <Paper sx={{ p: 3, flex: 1 }}>
                                    <Typography fontWeight={600} mb={2}>Subject Wise Marks</Typography>

                                    <ResponsiveContainer width="100%" height={320}>
                                        <PieChart>
                                            <Pie
                                                data={reportData?.subjectWiseMarksPie || []}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="40%"
                                                outerRadius={80}
                                                label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                                                    // Calculate label position OUTSIDE the pie
                                                    const RADIAN = Math.PI / 180;
                                                    // provide safe defaults in case values are undefined
                                                    const safeMidAngle = typeof midAngle === 'number' ? midAngle : 0;
                                                    const safeCx = typeof cx === 'number' ? cx : 0;
                                                    const safeCy = typeof cy === 'number' ? cy : 0;
                                                    const safeOuterRadius = typeof outerRadius === 'number' ? outerRadius : 0;
                                                    const radius = safeOuterRadius + 25; // distance outside
                                                    const x = safeCx + radius * Math.cos(-safeMidAngle * RADIAN);
                                                    const y = safeCy + radius * Math.sin(-safeMidAngle * RADIAN);

                                                    return (
                                                        <text
                                                            x={x}
                                                            y={y}
                                                            textAnchor={x > safeCx ? "start" : "end"}
                                                            dominantBaseline="central"
                                                            style={{ fontSize: "12px", fill: "#333" }}
                                                        >
                                                            <tspan>{name}</tspan>
                                                            <tspan x={x} dy="1.2em">{value}%</tspan>
                                                        </text>
                                                    );
                                                }}
                                                labelLine={true}
                                            >
                                                {(reportData?.subjectWiseMarksPie || []).map((_entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                ))}
                                            </Pie>

                                            <ReTooltip formatter={(value) => `${value}%`} />

                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Stack>

                            {renderSubjectAverageCharts()}

                            {/* Detailed Marks Table */}
                            <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            Students Performance {reportData?.currentYear && reportData?.currentTerm && (
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    ({reportData.currentYear} - {reportData.currentTerm})
                                                </Typography>
                                            )}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<FileDownloadIcon />}
                                            onClick={() => exportToExcel()}
                                        >
                                            Excel
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<FileDownloadIcon />}
                                            onClick={() => exportToPDF()}
                                        >
                                            PDF
                                        </Button>
                                    </Stack>
                                </Box>
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
    );
};

export default ParentReport;