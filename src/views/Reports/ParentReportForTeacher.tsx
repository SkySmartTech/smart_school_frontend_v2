import React, { useState, useEffect } from "react";
import {
    Box,
    CssBaseline,
    AppBar,
    Stack,
    Typography,
    Paper,
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
    Autocomplete,
    Button,
    useMediaQuery,
    Collapse,
    IconButton,
    Divider,
    MenuItem,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

import {
    fetchParentReport,
    type ParentReportData,
    type DetailedMarksTableRow,
    fetchClassStudents,
    getAvailableYears,
    fetchGrades,
    fetchClasses,
    type GradeOption,
    type ClassOption
} from "../../api/parentReportForTeacherApi";

interface Student {
    [x: string]: any;
    id: number;
    name: string;
    student: {
        id: number;
        studentGrade: string;
        studentClass: string;
        medium: string;
        studentAdmissionNo: string;
        year: string;
        userId: string;
    };
}

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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [exam, setExam] = useState("");
    const [month, setMonth] = useState("");
    const [startYear, setStartYear] = useState<string | null>(null);
    const [endYear, setEndYear] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [gradeOptions, setGradeOptions] = useState<GradeOption[]>([]);
    const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
    const [isLoadingYears, setIsLoadingYears] = useState(false);
    const [gradeOptionsLoading, setGradeOptionsLoading] = useState(false);
    const [classOptionsLoading, setClassOptionsLoading] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // Student related state
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    type SnackbarState = {
        open: boolean;
        message: string;
        severity: "success" | "info" | "warning" | "error";
    };
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

    // Load available years on mount
    useEffect(() => {
        let mounted = true;
        const loadYears = async () => {
            setIsLoadingYears(true);
            try {
                const years = await getAvailableYears();
                if (mounted) {
                    setAvailableYears(years);
                }
            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load years: ${err?.message || 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setIsLoadingYears(false);
            }
        };

        loadYears();
        return () => { mounted = false; };
    }, []);

    // Clear month when exam is not "Monthly"
    useEffect(() => {
        if (exam !== MONTHLY_EXAM_VALUE) {
            setMonth("");
        }
    }, [exam]);

    // Fetch grades on component mount
    useEffect(() => {
        let mounted = true;
        const loadGrades = async () => {
            setGradeOptionsLoading(true);
            try {
                const grades = await fetchGrades();
                if (mounted) {
                    setGradeOptions(grades);
                }
            } catch (error) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load grades: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setGradeOptionsLoading(false);
            }
        };
        loadGrades();
        return () => { mounted = false; };
    }, []);

    // Fetch classes on component mount
    useEffect(() => {
        let mounted = true;
        const loadClasses = async () => {
            setClassOptionsLoading(true);
            try {
                const classes = await fetchClasses();
                if (mounted) {
                    setClassOptions(classes);
                }
            } catch (error) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load classes: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setClassOptionsLoading(false);
            }
        };
        loadClasses();
        return () => { mounted = false; };
    }, []);

    const hasValidFilters = (): boolean => {
        const hasExamFilter = Boolean(exam);
        const hasYearFilter = Boolean(startYear && endYear);
        return (hasExamFilter || hasYearFilter) && Boolean(selectedGrade && selectedClass);
    };

    // Load students on mount
    useEffect(() => {
        let mounted = true;
        const loadStudents = async () => {
            setIsLoadingStudents(true);
            try {
                const students = await fetchClassStudents();
                if (!mounted) return;
                if (Array.isArray(students)) {
                    setStudentOptions(students);
                } else {
                    setStudentOptions([]);
                }
            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load students: ${err?.message || 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setIsLoadingStudents(false);
            }
        };

        loadStudents();
        return () => { mounted = false; };
    }, []);

    // Fetches report data for the selected student
    const {
        data: reportData,
        isLoading: isLoadingReport,
        isError: isErrorReport,
        error: errorReport
    } = useQuery<ParentReportData, Error>({
        queryKey: [
            "parent-report",
            selectedStudent?.student.studentAdmissionNo || '',
            startYear || '',
            endYear || '',
            exam,
            month,
            selectedGrade,
            selectedClass
        ],
        queryFn: () => {
            const admissionNo = selectedStudent?.student.studentAdmissionNo;

            if (!admissionNo) {
                throw new Error("Student information not available");
            }

            const startYearValue = startYear || '2024';
            const endYearValue = endYear || '2024';
            const examValue = exam || 'First';
            const monthValue = exam === MONTHLY_EXAM_VALUE ? month : "";

            return fetchParentReport(
                admissionNo,
                startYearValue,
                endYearValue,
                examValue,
                monthValue,
                selectedGrade,
                selectedClass
            );
        },
        enabled: Boolean(selectedStudent?.student.studentAdmissionNo) && hasValidFilters(),
        retry: 1
    });

    // Handle side effects for errors
    useEffect(() => {
        if (isErrorReport && errorReport) {
            setSnackbar({
                open: true,
                message: `Failed to load report data: ${errorReport.message}`,
                severity: "error"
            });
        }
    }, [isErrorReport, errorReport]);

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const clearFilters = () => {
        setStartYear(null);
        setEndYear(null);
        setExam("");
        setMonth("");
        setSelectedGrade("");
        setSelectedClass("");
    };

    const handleStudentSelect = (value: Student | null) => {
        if (!value) {
            setSelectedStudent(null);
            return;
        }
        setSelectedStudent(value);
    };

    // Get the term key based on selected exam
    const getTermKeyForExam = (examValue: string): 'firstTerm' | 'secondTerm' | 'thirdTerm' | null => {
        switch (examValue) {
            case 'First Term':
                return 'firstTerm';
            case 'Second Term':
                return 'secondTerm';
            case 'Third Term':
                return 'thirdTerm';
            default:
                return null;
        }
    };

    // Filter bar chart data to show only selected term
    const getFilteredBarChartData = () => {
        if (!reportData?.overallSubjectLineGraph) {
            return [];
        }

        const termKey = getTermKeyForExam(exam);
        if (!termKey) {
            return [];
        }

        return reportData.overallSubjectLineGraph.map(item => ({
            year: item.year,
            value: item[termKey as keyof typeof item] || 0
        }));
    };

    // Export to PDF
    const exportToPDF = () => {
        if (!reportData || !reportData.studentMarksDetailedTable || !selectedStudent) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(16);
        doc.text(`Student Performance Report`, pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        let currentY = 25;
        
        // Student Details Section - Use selectedStudent for name and student details
        const studentName = selectedStudent.name || reportData.studentName || 'Absent';
        const studentAdmissionNo = selectedStudent.student.studentAdmissionNo || reportData.studentAdmissionNo || 'Absent';
        const studentGrade = selectedStudent.student.studentGrade || reportData.studentGrade || 'Absent';
        const studentClass = selectedStudent.student.studentClass || reportData.studentClass || 'Absent';
        
        doc.text(`Student Name: ${studentName}`, 15, currentY);
        currentY += 7;
        doc.text(`Admission No: ${studentAdmissionNo}`, 15, currentY);
        currentY += 7;
        doc.text(`Grade: ${studentGrade} | Class: ${studentClass}`, 15, currentY);
        currentY += 7;
        
        if (reportData.currentYear && reportData.currentTerm) {
            doc.text(`Current Year: ${reportData.currentYear} | Current Term: ${reportData.currentTerm}`, 15, currentY);
            currentY += 7;
        }
        
        const tableData = reportData.studentMarksDetailedTable.map(row => [
            row.subject,
            row.highestMarks,
            row.highestMarkGrade,
            row.studentMarks > 0 ? row.studentMarks : 'Absent',
            row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'
        ]);

        // Compute overall average (consider only present marks)
        const rowsWithMarksPDF = reportData.studentMarksDetailedTable.filter(r => typeof r.studentMarks === 'number' && r.studentMarks > 0);
        if (rowsWithMarksPDF.length > 0) {
            const totalPdfMarks = rowsWithMarksPDF.reduce((s, cur) => s + cur.studentMarks, 0);
            const avgPdf = (totalPdfMarks / rowsWithMarksPDF.length).toFixed(1);
            // Append overall average row to table data
            tableData.push(['Overall Average', '', '', avgPdf, '']);
        }

        autoTable(doc, {
            head: [['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade']],
            body: tableData,
            startY: currentY + 5,
            theme: 'grid',
            headStyles: { fillColor: [13, 21, 66], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        doc.save(`Student_Performance_${studentName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Export to Excel
    const exportToExcel = () => {
        if (!reportData || !reportData.studentMarksDetailedTable || !selectedStudent) return;

        const studentName = selectedStudent.name || reportData.studentName || 'Absent';
        const studentAdmissionNo = selectedStudent.student.studentAdmissionNo || reportData.studentAdmissionNo || 'Absent';
        const studentGrade = selectedStudent.student.studentGrade || reportData.studentGrade || 'Absent';
        const studentClass = selectedStudent.student.studentClass || reportData.studentClass || 'Absent';

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // ========== SHEET 1: SUMMARY ==========
        // Include student info and a compact marks table so the user sees marks immediately
        const marksRowsForSummary = reportData.studentMarksDetailedTable.map(row => (
            [
                row.subject,
                row.highestMarks,
                row.highestMarkGrade,
                row.studentMarks > 0 ? row.studentMarks : 'Absent',
                row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'
            ]
        ));

        // compute totals for display in both sheets
        const rowsWithMarks = reportData.studentMarksDetailedTable.filter(r => typeof r.studentMarks === 'number' && r.studentMarks > 0);
        let totalMarksVal: number | null = null;
        let avgMarksVal: string | null = null;
        if (rowsWithMarks.length > 0) {
            totalMarksVal = rowsWithMarks.reduce((s, cur) => s + cur.studentMarks, 0);
            avgMarksVal = (totalMarksVal / rowsWithMarks.length).toFixed(2);
        }

        const summaryData: any[] = [
            ['STUDENT PERFORMANCE REPORT'],
            [],
            ['Student Name:', studentName],
            ['Admission No:', studentAdmissionNo],
            ['Grade:', studentGrade],
            ['Class:', studentClass],
            ['Current Year:', reportData.currentYear ? String(reportData.currentYear) : 'Absent'],
            ['Current Term:', reportData.currentTerm || 'Absent'],
            [],
            ['MARKS DETAILS'],
            ['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade'],
            ...marksRowsForSummary
        ];

        // append total/average row into summary if available
        if (avgMarksVal !== null) {
            summaryData.push([]);
            summaryData.push(['TOTAL/AVERAGE', '', '', totalMarksVal, avgMarksVal]);
        }

        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths for summary
        summaryWorksheet['!cols'] = [
            { wch: 25 },  // Subject / Label
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];

        // Style the title row
        if (summaryWorksheet['A1']) {
            summaryWorksheet['A1'].s = {
                font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '0D1542' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }

        // Merge cells for title (A1:E1) to span the marks columns too
        if (!summaryWorksheet['!merges']) {
            summaryWorksheet['!merges'] = [];
        }
        summaryWorksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

        // Style info labels (bold left column)
        for (let row = 3; row <= 8; row++) {
            const cellRef = `A${row}`;
            if (summaryWorksheet[cellRef]) {
                summaryWorksheet[cellRef].s = {
                    font: { bold: true, size: 11 },
                    alignment: { horizontal: 'left', vertical: 'center' }
                };
            }
        }

        // Style the small marks table header (row index where header appears)
        const summaryMarksHeaderRow = 11; // 1-based index where header is placed
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
            const cellRef = `${col}${summaryMarksHeaderRow}`;
            if (summaryWorksheet[cellRef]) {
                const horiz = (col === 'C' || col === 'E') ? 'right' : 'center';
                summaryWorksheet[cellRef].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '0D1542' } },
                    alignment: { horizontal: horiz as any, vertical: 'center' }
                };
            }
        });

        // Style marks rows in summary (alternating colors, left align subject)
        const summaryStartDataRow = summaryMarksHeaderRow + 1;
        const summaryEndDataRow = summaryStartDataRow + marksRowsForSummary.length - 1;
        for (let row = summaryStartDataRow; row <= summaryEndDataRow; row++) {
            ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
                const cellRef = `${col}${row}`;
                if (summaryWorksheet[cellRef]) {
                    const isEven = (row - summaryStartDataRow) % 2 === 0;
                    const horiz = (idx === 0) ? 'left' : (idx === 2 || idx === 4) ? 'right' : 'center';
                    summaryWorksheet[cellRef].s = {
                        fill: isEven ? { fgColor: { rgb: 'F7F7F7' } } : { fgColor: { rgb: 'FFFFFF' } },
                        alignment: { horizontal: horiz as any, vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                        }
                    };
                }
            });
        }

        // Style total row if exists in summary
        if (avgMarksVal !== null) {
            const totalRowIndex = summaryEndDataRow + 1;
            ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
                const cellRef = `${col}${totalRowIndex}`;
                if (summaryWorksheet[cellRef]) {
                    summaryWorksheet[cellRef].s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' } },
                        fill: { fgColor: { rgb: '4CAF50' } },
                        alignment: { horizontal: idx === 0 ? 'left' : 'center', vertical: 'center' }
                    };
                }
            });
        }

        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

        // ========== SHEET 2: MARKS DETAILS ==========
        const marksData: any[] = [
            ['MARKS DETAILS'],
            [],
            ['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade']
        ];

        // Add student marks rows
        reportData.studentMarksDetailedTable.forEach(row => {
            marksData.push([
                row.subject,
                row.highestMarks,
                row.highestMarkGrade,
                row.studentMarks > 0 ? row.studentMarks : 'Absent',
                row.studentGrade !== 'Absent' ? row.studentGrade : 'Absent'
            ]);
        });

        // Calculate totals if there are marks (use previously computed totals)
        if (avgMarksVal !== null && totalMarksVal !== null) {
            marksData.push([]);
            marksData.push(['TOTAL/AVERAGE', '', '', totalMarksVal, avgMarksVal]);
        }

        const marksWorksheet = XLSX.utils.aoa_to_sheet(marksData);

        // Set column widths for marks sheet
        marksWorksheet['!cols'] = [
            { wch: 25 },  // Subject
            { wch: 15 },  // Highest Marks
            { wch: 15 },  // Highest Grade
            { wch: 15 },  // Student Marks
            { wch: 15 }   // Student Grade
        ];

        // Style title row
        if (marksWorksheet['A1']) {
            marksWorksheet['A1'].s = { 
                font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } }, 
                fill: { fgColor: { rgb: '0D1542' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }

        // Merge cells for marks title (A1:E1)
        if (!marksWorksheet['!merges']) {
            marksWorksheet['!merges'] = [];
        }
        marksWorksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

        // Style header row (row 3)
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
            const cellRef = `${col}3`;
            if (marksWorksheet[cellRef]) {
                const horiz = (col === 'C' || col === 'E') ? 'right' : 'center';
                marksWorksheet[cellRef].s = {
                    font: { bold: true, size: 11, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '0D1542' } },
                    alignment: { horizontal: horiz as any, vertical: 'center' }
                };
            }
        });

        // Style data rows with alternating colors
        const startDataRow = 4;
        const endDataRow = startDataRow + reportData.studentMarksDetailedTable.length - 1;
        
        for (let row = startDataRow; row <= endDataRow; row++) {
            ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
                const cellRef = `${col}${row}`;
                if (marksWorksheet[cellRef]) {
                    const isEven = (row - startDataRow) % 2 === 0;
                    const horiz = (idx === 0) ? 'left' : (idx === 2 || idx === 4) ? 'right' : 'center';
                    marksWorksheet[cellRef].s = {
                        fill: isEven ? { fgColor: { rgb: 'F0F0F0' } } : { fgColor: { rgb: 'FFFFFF' } },
                        alignment: { 
                            horizontal: horiz as any,
                            vertical: 'center',
                            wrapText: true 
                        },
                        border: {
                            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                        }
                    };
                }
            });
        }

        // Style total row if exists
        const totalRowNum = endDataRow + 1;
        if (rowsWithMarks.length > 0) {
            ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
                const cellRef = `${col}${totalRowNum}`;
                if (marksWorksheet[cellRef]) {
                    const horiz = (idx === 0) ? 'left' : (idx === 2 || idx === 4) ? 'right' : 'center';
                    marksWorksheet[cellRef].s = {
                        font: { bold: true, size: 11, color: { rgb: 'FFFFFF' } },
                        fill: { fgColor: { rgb: '4CAF50' } },
                        alignment: { horizontal: horiz as any, vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                        }
                    };
                }
            });
        }

        XLSX.utils.book_append_sheet(workbook, marksWorksheet, 'Marks Details');

        const filename = `Student_Performance_${studentName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
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
                    <TableCell colSpan={5} align="center">
                        <Typography variant="body2" sx={{ py: 2 }}>
                            Marks have not been added to the subjects yet. Please check after submitting the marks.
                        </Typography>
                    </TableCell>
                </TableRow>
            );
        }

        const rowsWithMarks = reportData.studentMarksDetailedTable.filter(row => row.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const averageMarks = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'Absent';

        const rows = reportData.studentMarksDetailedTable.map((row: DetailedMarksTableRow, idx: number) => (
            <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 100 : 'auto' }}>{row.subject}</TableCell>
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
        
        // For mobile, show one chart per row
        if (isMobile) {
            return (
                <Stack spacing={3}>
                    {subjects.map((subjectName) => (
                        <Paper key={subjectName} sx={{ p: 2 }}>
                            <Typography fontWeight={600} mb={2} variant="subtitle1">{subjectName} Subject</Typography>
                            <ResponsiveContainer width="100%" height={200}>
                                {individualSubjectAverages[subjectName] && individualSubjectAverages[subjectName]!.length > 0 ? (
                                    <LineChart data={individualSubjectAverages[subjectName]}>
                                        <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 100]} label={{ value: 'Marks', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} tick={{ fontSize: 10 }} />
                                        <ReTooltip />
                                        <Line type="monotone" dataKey="y" stroke="#42A5F5" name="Average Marks" strokeWidth={2} />
                                    </LineChart>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                        <Typography variant="body2" color="text.secondary">No data for {subjectName}</Typography>
                                    </Box>
                                )}
                            </ResponsiveContainer>
                        </Paper>
                    ))}
                </Stack>
            );
        }

        // For tablet and desktop, show multiple charts per row
        const subjectRows = [];
        const chartsPerRow = isTablet ? 2 : 3;
        for (let i = 0; i < subjects.length; i += chartsPerRow) {
            subjectRows.push(subjects.slice(i, i + chartsPerRow));
        }

        return (
            <Stack spacing={3}>
                {subjectRows.map((row, rowIndex) => (
                    <Stack key={rowIndex} direction="row" spacing={3}>
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
                        {row.length < chartsPerRow && Array.from({ length: chartsPerRow - row.length }).map((_, emptyIndex) => (
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
                        boxShadow: "none", 
                        bgcolor: theme.palette.background.paper,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                    }}>
                        <Navbar title="Student Report For Teacher" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    </AppBar>

                    <Stack spacing={3} sx={{ px: { xs: 1.5, sm: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
                        {/* Filter Section with Collapsible on Mobile */}
                        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
                            <Stack 
                                direction="row" 
                                justifyContent="space-between" 
                                alignItems="center"
                                onClick={() => isMobile && setFiltersExpanded(!filtersExpanded)}
                                sx={{ cursor: isMobile ? 'pointer' : 'default', mb: filtersExpanded ? 2 : 0 }}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                    Report Filters
                                </Typography>
                                {isMobile && (
                                    <IconButton size="small">
                                        {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                )}
                            </Stack>
                            
                            <Collapse in={filtersExpanded || !isMobile}>
                                <Stack spacing={2}>
                                    {/* Year Filters */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <Autocomplete
                                            fullWidth
                                            options={availableYears}
                                            value={startYear}
                                            onChange={(_, newValue) => setStartYear(newValue || null)}
                                            loading={isLoadingYears}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Start Year"
                                                    size="small"
                                                    placeholder="Select year"
                                                />
                                            )}
                                        />

                                        <Autocomplete
                                            fullWidth
                                            options={availableYears}
                                            value={endYear}
                                            onChange={(_, newValue) => setEndYear(newValue || null)}
                                            loading={isLoadingYears}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="End Year"
                                                    size="small"
                                                    placeholder="Select year"
                                                />
                                            )}
                                        />
                                    </Stack>

                                    {/* Exam and Month Filters */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <Autocomplete
                                            fullWidth
                                            options={examOptions}
                                            value={examOptions.find(opt => opt.value === exam) || null}
                                            onChange={(_, newValue) => setExam(newValue?.value || '')}
                                            getOptionLabel={(option) => option.label}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Exam Type"
                                                    size="small"
                                                />
                                            )}
                                        />

                                        {exam === MONTHLY_EXAM_VALUE && (
                                            <Autocomplete
                                                fullWidth
                                                options={months}
                                                value={month}
                                                onChange={(_, newValue) => setMonth(newValue || '')}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Month"
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        )}
                                    </Stack>

                                    {/* Grade and Class Filters */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Grade"
                                            value={selectedGrade}
                                            onChange={(e) => setSelectedGrade(e.target.value)}
                                            disabled={gradeOptionsLoading}
                                            size="small"
                                        >
                                            {gradeOptions.map((gradeOption) => (
                                                <MenuItem key={gradeOption.id} value={gradeOption.grade}>
                                                    {gradeOption.grade}
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        <TextField
                                            select
                                            fullWidth
                                            label="Class"
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            disabled={classOptionsLoading}
                                            size="small"
                                        >
                                            {classOptions.map((classOption) => (
                                                <MenuItem key={classOption.id} value={classOption.class}>
                                                    {classOption.class}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>

                                    {/* Clear Filters Button */}
                                    <Box sx={{ mt: 1 }}>
                                        <Button 
                                            variant="outlined" 
                                            color="primary"
                                            onClick={clearFilters}
                                            sx={{ textTransform: 'none', fontWeight: 600 }}
                                            size="small"
                                        >
                                            Clear Filters
                                        </Button>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Student Selection */}
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', md: '1rem' } }}>
                                        Student Details
                                    </Typography>

                                    <Autocomplete
                                        fullWidth
                                        id="student-select"
                                        options={studentOptions}
                                        value={selectedStudent}
                                        onChange={(_event, newValue) => handleStudentSelect(newValue as Student | null)}
                                        getOptionLabel={(option) =>
                                            typeof option === 'string'
                                                ? option
                                                : `${option.name} (${option.student.studentAdmissionNo})`
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select Student"
                                                variant="outlined"
                                                size="small"
                                            />
                                        )}
                                        loading={isLoadingStudents}
                                        loadingText="Loading students..."
                                        noOptionsText="No students found"
                                    />

                                    {/* Display selected student info */}
                                    {selectedStudent && (
                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Admission No:</strong> {selectedStudent.student.studentAdmissionNo}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Grade:</strong> {selectedStudent.student.studentGrade}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Class:</strong> {selectedStudent.student.studentClass}
                                                </Typography>
                                            </Stack>
                                        </Paper>
                                    )}
                                </Stack>
                            </Collapse>
                        </Paper>

                        {/* Show message if no valid filters */}
                        {!hasValidFilters() && (
                            <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                    Please select the filters to view report data
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '0.875rem' } }}>
                                    Choose either an exam (and month) or select a date range to load the report.
                                </Typography>
                            </Paper>
                        )}

                        {/* Charts and Data - Only show if valid filters are applied */}
                        {hasValidFilters() && selectedStudent && (
                            <>
                                {/* Charts Section */}
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                    {/* Overall Subject Bar Chart */}
                                    <Paper sx={{ p: { xs: 2, md: 3 }, flex: { xs: 1, md: 2 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography fontWeight={600} sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
                                                Overall Subject
                                            </Typography>
                                            {exam && getTermKeyForExam(exam) && (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                    {exam}
                                                </Typography>
                                            )}
                                        </Stack>
                                        <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                                            {isLoadingReport ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : getFilteredBarChartData().length > 0 ? (
                                                <BarChart data={getFilteredBarChartData()} barSize={isMobile ? 30 : 50}>
                                                    <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: isMobile ? 10 : 12 }} />
                                                    <ReTooltip />
                                                    <Bar dataKey="value" fill="#0d1542ff" name={exam || 'Term'} />
                                                </BarChart>
                                            ) : (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                    <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                                                        Select a term to view data
                                                    </Typography>
                                                </Box>
                                            )}
                                        </ResponsiveContainer>
                                    </Paper>

                                    {/* Subject Wise Marks (Pie Chart) */}
                                    <Paper sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
                                        <Typography fontWeight={600} mb={2} sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
                                            Subject Wise Marks
                                        </Typography>

                                        <ResponsiveContainer width="100%" height={isMobile ? 280 : 320}>
                                            <PieChart>
                                                <Pie
                                                    data={reportData?.subjectWiseMarksPie || []}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="40%"
                                                    outerRadius={isMobile ? 60 : 80}
                                                    label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                                                        const RADIAN = Math.PI / 180;
                                                        const safeMidAngle = typeof midAngle === 'number' ? midAngle : 0;
                                                        const safeCx = typeof cx === 'number' ? cx : 0;
                                                        const safeCy = typeof cy === 'number' ? cy : 0;
                                                        const safeOuterRadius = typeof outerRadius === 'number' ? outerRadius : 0;
                                                        const radius = safeOuterRadius + (isMobile ? 15 : 25);
                                                        const x = safeCx + radius * Math.cos(-safeMidAngle * RADIAN);
                                                        const y = safeCy + radius * Math.sin(-safeMidAngle * RADIAN);

                                                        return (
                                                            <text
                                                                x={x}
                                                                y={y}
                                                                textAnchor={x > safeCx ? "start" : "end"}
                                                                dominantBaseline="central"
                                                                style={{ fontSize: isMobile ? "10px" : "12px", fill: "#333" }}
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
                                                    wrapperStyle={{ fontSize: isMobile ? '10px' : '12px', paddingTop: '10px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Stack>

                                {renderSubjectAverageCharts()}

                                {/* Detailed Marks Table */}
                                <Paper elevation={2} sx={{ p: { xs: 1.5, md: 2 }, overflowX: 'auto' }}>
                                    <Stack 
                                        direction={{ xs: 'column', sm: 'row' }} 
                                        justifyContent="space-between" 
                                        alignItems={{ xs: 'flex-start', sm: 'center' }} 
                                        mb={2}
                                        spacing={{ xs: 1.5, sm: 0 }}
                                    >
                                        <Stack>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                                Students Performance
                                            </Typography>
                                            {reportData?.currentYear && reportData?.currentTerm && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                    Current Year: {reportData.currentYear} | Current Term: {reportData.currentTerm}
                                                </Typography>
                                            )}
                                        </Stack>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={exportToPDF}
                                                disabled={isLoadingReport || !reportData?.studentMarksDetailedTable}
                                                fullWidth={isMobile}
                                                sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                                            >
                                                Export PDF
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={exportToExcel}
                                                disabled={isLoadingReport || !reportData?.studentMarksDetailedTable}
                                                fullWidth={isMobile}
                                                sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                                            >
                                                Export Excel
                                            </Button>
                                        </Stack>
                                    </Stack>
                                    <TableContainer>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Subject</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Highest Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Highest Grade</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Student Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Student Grade</TableCell>
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