import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Stack,
    CircularProgress,
    CssBaseline,
    AppBar,
    useTheme,
    Button,
    Typography,
    Paper,
    TextField,
    Snackbar,
    Alert,
    Box,
    InputAdornment,
    MenuItem,
    Chip,
    Tooltip,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    AlertTitle,
    useMediaQuery,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DataGrid } from '@mui/x-data-grid';
import type {
    GridColDef,
    GridRenderCellParams,
    GridRowId,
} from '@mui/x-data-grid';
import * as XLSX from 'xlsx';

import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';

import {
    submitStudentMarks,
    fetchGradesFromApi,
    fetchClassesFromApi,
    fetchAdmissionData,
    type StudentMark,
} from '../../api/addmarksApi';

import ClassIcon from '@mui/icons-material/Class';
import SubjectIcon from '@mui/icons-material/Subject';
import EventIcon from '@mui/icons-material/Event';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';

import useTeacherProfile from '../../hooks/useTeacherProfile';
import Footer from '../../components/Footer';

const examOptions = [
    { label: 'First Term', value: 'First' },
    { label: 'Second Term', value: 'Mid' },
    { label: 'Third Term', value: 'End' },
    { label: 'Monthly Test', value: 'Monthly' },
];

const monthOptions = [
    { label: 'January', value: 'January' }, { label: 'February', value: 'February' },
    { label: 'March', value: 'March' }, { label: 'April', value: 'April' },
    { label: 'May', value: 'May' }, { label: 'June', value: 'June' },
    { label: 'July', value: 'July' }, { label: 'August', value: 'August' },
    { label: 'September', value: 'September' }, { label: 'October', value: 'October' },
    { label: 'November', value: 'November' }, { label: 'December', value: 'December' },
];

const yearOptions = [
    { label: '2023', value: '2023' },
    { label: '2024', value: '2024' },
    { label: '2025', value: '2025' },
    { label: '2026', value: '2026' },
    { label: '2027', value: '2027' },
    { label: '2028', value: '2028' },
];

interface FilterFormData {
    selectedGrade: string;
    selectedClass: string;
    selectedSubject: string;
    selectedExam: string;
    selectedMonth: string;
    selectedYear: string;
    searchQuery: string;
}

interface AdmissionData {
    id: number;
    student_admission: string;
    student_name: string;
}

interface ExtendedStudentMark extends StudentMark {
    attendance?: 'present' | 'absent';
    status?: boolean;
}

interface ExcelRow {
    'Admission No': string;
    'Student Name': string;
    'Grade': string;
    'Class': string;
    'Subject': string;
    'Term': string;
    'Month'?: string;
    'Year': string;
    'Marks': string;
    'Attendance': string;
}

const TeacherDashboard: React.FC = () => {
    const { data: teacherProfile, isLoading: profileLoading } = useTeacherProfile();
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [gradeOptions, setGradeOptions] = useState<{ label: string; value: string }[]>([]);
    const [classOptions, setClassOptions] = useState<{ label: string; value: string }[]>([]);
    const [students, setStudents] = useState<ExtendedStudentMark[]>([]);
    const [admissionData, setAdmissionData] = useState<AdmissionData[]>([]);
    const [modifiedMarks, setModifiedMarks] = useState<Record<GridRowId, Partial<ExtendedStudentMark>>>({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
    const [, setExcelFile] = useState<File | null>(null);
    const [excelError, setExcelError] = useState<string>('');
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [excelData, setExcelData] = useState<ExtendedStudentMark[]>([]);

    const admissionDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastFetchParamsRef = useRef<string>('');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { control, watch, reset } = useForm<FilterFormData>({
        defaultValues: {
            selectedGrade: '',
            selectedClass: '',
            selectedSubject: '',
            selectedExam: '',
            selectedMonth: '',
            selectedYear: '',
            searchQuery: ''
        }
    });

    const formValues = watch();
    const { selectedGrade, selectedClass, selectedSubject, selectedExam, selectedMonth, selectedYear, searchQuery } = formValues;
    const isMonthFilterEnabled = selectedExam === 'Monthly';

    const formatSubjectName = useCallback((subject: string): string => {
        if (!subject) return subject;
        return subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
    }, []);

    const formatExamName = useCallback((exam: string): string => {
        const examMap: Record<string, string> = {
            'First Term': 'First',
            'Second Term': 'Mid',
            'Third Term': 'End',
            'Monthly Term': 'Monthly'
        };
        return examMap[exam] || exam;
    }, []);

    const subjectOptions = useMemo(() => {
        if (!teacherProfile?.teacher_data || !Array.isArray(teacherProfile.teacher_data) || !selectedGrade || !selectedClass) {
            return [];
        }

        const subjects = teacherProfile.teacher_data
            .filter(teacher =>
                teacher.teacherGrade === selectedGrade &&
                teacher.teacherClass === selectedClass
            )
            .map(teacher => ({
                label: formatSubjectName(teacher.subject),
                value: teacher.subject
            }));

        return subjects.filter((subject, index, self) =>
            index === self.findIndex(s => s.value.toLowerCase() === subject.value.toLowerCase())
        );
    }, [teacherProfile?.teacher_data, selectedGrade, selectedClass, formatSubjectName]);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;

        const query = searchQuery.toLowerCase();
        return students.filter(student =>
            student.student_name.toLowerCase().includes(query) ||
            student.student_admission.toLowerCase().includes(query)
        );
    }, [students, searchQuery]);

    const isFormValid = useMemo(() => {
        return selectedGrade && selectedClass && selectedSubject && selectedExam && selectedYear &&
            (selectedExam !== 'Monthly' || selectedMonth);
    }, [selectedGrade, selectedClass, selectedSubject, selectedExam, selectedYear, selectedMonth]);

    const modifiedCount = useMemo(() => {
        return Object.values(modifiedMarks).filter(mark =>
            (mark.marks !== undefined && mark.marks !== '') || mark.attendance !== undefined
        ).length;
    }, [modifiedMarks]);

    const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    }, []);

    const calculateGrade = useCallback((marks: number): string => {
        if (marks < 0 || marks > 100) return "Invalid";
        if (marks <= 39) return "F";
        if (marks < 50) return "S";
        if (marks < 65) return "C";
        if (marks < 75) return "B";
        return "A";
    }, []);

    const fetchGrades = useCallback(async () => {
        if (profileLoading) return;

        setLoading(true);
        try {
            const grades = await fetchGradesFromApi();
            setGradeOptions(grades);
        } catch (error) {
            console.error("Failed to fetch grades:", error);
            showSnackbar(
                `Failed to load grades: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    }, [profileLoading, showSnackbar]);

    const fetchClasses = useCallback(async (grade: string) => {
        if (!grade) {
            setClassOptions([]);
            return;
        }

        try {
            const classes = await fetchClassesFromApi(grade);
            setClassOptions(classes);
        } catch (error) {
            console.error("Failed to fetch classes:", error);
            showSnackbar(
                `Failed to load classes: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
                'error'
            );
        }
    }, [showSnackbar]);

    const fetchAdmissionDataHandler = useCallback(async (grade: string, classValue: string, year: string) => {
        if (!grade || !classValue || !year) {
            setAdmissionData([]);
            setStudents([]);
            return;
        }

        const cacheKey = `${grade}-${classValue}-${year}`;
        if (lastFetchParamsRef.current === cacheKey) {
            return;
        }

        try {
            setLoading(true);
            const data = await fetchAdmissionData(grade, classValue, '');
            setAdmissionData(data);
            lastFetchParamsRef.current = cacheKey;

            const initialStudents: ExtendedStudentMark[] = data.map((item, index) => ({
                id: index + 1,
                student_admission: item.student_admission,
                student_name: item.student_name,
                student_grade: grade,
                student_class: classValue,
                subject: selectedSubject ? formatSubjectName(selectedSubject) : '',
                term: selectedExam || '',
                marks: '',
                student_grade_value: '',
                month: isMonthFilterEnabled ? selectedMonth : undefined,
                year: year,
                attendance: 'present',
                status: true
            }));

            setStudents(initialStudents);
            setModifiedMarks({});
        } catch (error) {
            console.error('Failed to fetch admission data:', error);
            showSnackbar(
                `Failed to load admission data: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    }, [selectedSubject, selectedExam, selectedMonth, isMonthFilterEnabled, showSnackbar, formatSubjectName]);

    const processRowUpdate = useCallback((newRow: ExtendedStudentMark) => {
        let grade = "";
        if (newRow.marks !== "") {
            const marks = parseInt(newRow.marks, 10);
            if (isNaN(marks) || marks < 0 || marks > 100) {
                showSnackbar('Please enter valid marks between 0 and 100', 'warning');
                return students.find(s => s.id === newRow.id) || newRow;
            }
            grade = calculateGrade(marks);
        }

        const updatedRow = { ...newRow, student_grade_value: grade };

        setStudents((prev) =>
            prev.map((s) => (s.id === updatedRow.id ? updatedRow : s))
        );

        setModifiedMarks((prevModified) => ({
            ...prevModified,
            [updatedRow.id]: {
                ...prevModified[updatedRow.id],
                marks: updatedRow.marks,
                student_grade_value: updatedRow.student_grade_value,
                student_admission: updatedRow.student_admission,
                attendance: updatedRow.attendance,
                status: updatedRow.attendance === 'present' ? true : false,
            },
        }));

        return updatedRow;
    }, [students, calculateGrade, showSnackbar]);

    const handleAttendanceChange = useCallback((studentId: GridRowId, attendance: 'present' | 'absent') => {
        const status = attendance === 'present' ? true : false;

        setStudents((prev) =>
            prev.map((s) => (s.id === studentId ? {
                ...s,
                attendance,
                status,
                marks: attendance === 'absent' ? '' : s.marks,
                student_grade_value: attendance === 'absent' ? '' : s.student_grade_value
            } : s))
        );

        setModifiedMarks((prevModified) => ({
            ...prevModified,
            [studentId]: {
                ...prevModified[studentId],
                attendance,
                status,
                marks: attendance === 'absent' ? '' : prevModified[studentId]?.marks,
                student_grade_value: attendance === 'absent' ? '' : prevModified[studentId]?.student_grade_value
            },
        }));
    }, []);

    const handleSubmitMarks = useCallback(async () => {
        if (!isFormValid) {
            showSnackbar('Please fill all required fields before submitting', 'warning');
            return;
        }

        setLoading(true);
        const marksToSubmit: Partial<ExtendedStudentMark>[] = Object.entries(modifiedMarks)
            .filter(([_, mark]) => mark.marks !== undefined && mark.marks !== '' || mark.attendance !== undefined)
            .map(([id, mark]) => {
                const student = students.find(s => s.id.toString() === id);
                if (!student) {
                    console.error(`Student not found for id ${id}`);
                    return null;
                }

                return {
                    id: parseInt(id as string),
                    student_admission: mark.student_admission || student.student_admission,
                    student_name: student.student_name,
                    student_grade: selectedGrade,
                    student_class: selectedClass,
                    subject: formatSubjectName(selectedSubject),
                    term: formatExamName(selectedExam),
                    month: isMonthFilterEnabled ? selectedMonth : "0",
                    marks: mark.marks || '0',
                    student_grade_value: mark.student_grade_value || 'N/A',
                    year: selectedYear,
                    attendance: mark.attendance || student.attendance || 'present',
                    status: mark.status !== undefined ? mark.status : (mark.attendance === 'present' ? true : false)
                };
            })
            .filter((mark): mark is NonNullable<typeof mark> => mark !== null);

        if (marksToSubmit.length === 0) {
            showSnackbar('No marks to submit.', 'info');
            setLoading(false);
            return;
        }

        try {
            await submitStudentMarks(marksToSubmit);
            showSnackbar(`Successfully submitted marks for ${marksToSubmit.length} students!`, 'success');
            setModifiedMarks({});
        } catch (error) {
            console.error('Failed to submit marks:', error);
            showSnackbar(
                `Failed to submit marks: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    }, [isFormValid, modifiedMarks, students, selectedGrade, selectedClass, selectedSubject, selectedExam, selectedMonth, selectedYear, isMonthFilterEnabled, showSnackbar, formatSubjectName, formatExamName]);

    const handleCloseSnackbar = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    }, []);

    const handleClearFilters = useCallback(() => {
        reset();
        setAdmissionData([]);
        setStudents([]);
        setModifiedMarks({});
        setClassOptions([]);
        lastFetchParamsRef.current = '';
    }, [reset]);

    const handleClearChanges = useCallback(() => {
        setModifiedMarks({});
        setStudents(prev => prev.map(student => ({
            ...student,
            marks: '',
            student_grade_value: '',
            attendance: 'present',
            status: true
        })));
        showSnackbar('All unsaved marks cleared', 'info');
    }, [showSnackbar]);

    const validateExcelData = (data: ExcelRow[]): string | null => {
        if (!data || data.length === 0) return "Excel file is empty";

        const requiredColumns = [
            'Admission No', 'Student Name', 'Grade', 'Class',
            'Subject', 'Term', 'Year', 'Marks', 'Attendance'
        ];

        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            return `Missing columns: ${missingColumns.join(', ')}`;
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            if (!row['Admission No'] || !row['Student Name'] || !row['Grade'] ||
                !row['Class'] || !row['Subject'] || !row['Term'] || !row['Year']) {
                return `Row ${i + 1}: Missing required fields`;
            }

            if (row['Marks']) {
                const marks = Number(row['Marks']);
                if (isNaN(marks) || marks < 0 || marks > 100) {
                    return `Row ${i + 1}: Invalid marks value (should be between 0-100)`;
                }
            }

            if (row['Attendance'] && !['present', 'absent'].includes(row['Attendance'].toLowerCase())) {
                return `Row ${i + 1}: Invalid attendance value (should be present/absent)`;
            }
        }

        return null;
    };

    const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setExcelFile(file);
        setExcelError('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

                const validationError = validateExcelData(jsonData);
                if (validationError) {
                    setExcelError(validationError);
                    return;
                }

                const transformedData: ExtendedStudentMark[] = jsonData.map((row, index) => ({
                    id: index + 1,
                    student_admission: row['Admission No'],
                    student_name: row['Student Name'],
                    student_grade: row['Grade'],
                    student_class: row['Class'],
                    subject: row['Subject'],
                    term: row['Term'],
                    marks: row['Marks'],
                    month: row['Month'],
                    year: row['Year'],
                    attendance: (row['Attendance']?.toLowerCase() || 'present') as 'present' | 'absent',
                    status: row['Attendance']?.toLowerCase() !== 'absent',
                    student_grade_value: calculateGrade(Number(row['Marks']))
                }));

                setExcelData(transformedData);
                setShowExcelPreview(true);
            } catch (error) {
                setExcelError('Failed to read Excel file. Please check the format.');
                console.error('Excel parsing error:', error);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleExcelSubmit = async () => {
        if (excelData.length === 0) {
            showSnackbar('No data to submit', 'error');
            return;
        }

        setLoading(true);
        try {
            await submitStudentMarks(excelData);
            showSnackbar('Successfully uploaded marks from Excel', 'success');
            setShowExcelPreview(false);
            setExcelFile(null);
            setExcelData([]);
        } catch (error) {
            showSnackbar(
                `Failed to upload Excel data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const template: ExcelRow[] = [{
            'Admission No': 'STU001',
            'Student Name': 'John Doe',
            'Grade': 'Grade 8',
            'Class': 'Araliya',
            'Subject': 'Mathematics',
            'Term': 'First',
            'Month': 'January',
            'Year': '2025',
            'Marks': '85',
            'Attendance': 'present'
        }];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'marks_template.xlsx');
    };

    useEffect(() => {
        if (!profileLoading && gradeOptions.length === 0) {
            fetchGrades();
        }
    }, [profileLoading]);

    useEffect(() => {
        fetchClasses(selectedGrade);
    }, [selectedGrade]);

    useEffect(() => {
        if (selectedGrade && selectedClass && selectedSubject && subjectOptions.length > 0) {
            const availableSubjects = subjectOptions.map(s => s.value);
            if (!availableSubjects.includes(selectedSubject)) {
                reset({
                    ...formValues,
                    selectedSubject: ''
                });
            }
        }
    }, [subjectOptions]);

    useEffect(() => {
        if (admissionDataTimeoutRef.current) {
            clearTimeout(admissionDataTimeoutRef.current);
        }

        if (selectedGrade && selectedClass && selectedYear) {
            admissionDataTimeoutRef.current = setTimeout(() => {
                fetchAdmissionDataHandler(selectedGrade, selectedClass, selectedYear);
            }, 300);
        } else {
            setAdmissionData([]);
            setStudents([]);
            lastFetchParamsRef.current = '';
        }

        return () => {
            if (admissionDataTimeoutRef.current) {
                clearTimeout(admissionDataTimeoutRef.current);
            }
        };
    }, [selectedGrade, selectedClass, selectedYear]);

    useEffect(() => {
        if (admissionData.length > 0) {
            setStudents(prevStudents =>
                prevStudents.map(student => ({
                    ...student,
                    subject: selectedSubject ? formatSubjectName(selectedSubject) : '',
                    term: selectedExam || '',
                    month: isMonthFilterEnabled ? selectedMonth : undefined,
                    year: selectedYear || '',
                    status: student.attendance === 'present' ? true : false
                }))
            );
        }
    }, [selectedSubject, selectedExam, selectedMonth, isMonthFilterEnabled, selectedYear, admissionData.length, formatSubjectName]);

    const columns: GridColDef<ExtendedStudentMark>[] = useMemo(() => [
        {
            field: 'student_admission',
            headerName: 'Admission No',
            width: isMobile ? 120 : 200,
            editable: false
        },
        {
            field: 'student_name',
            headerName: 'Student Name',
            width: isMobile ? 150 : 400,
            editable: false
        },
        {
            field: 'student_class',
            headerName: 'Class',
            width: isMobile ? 100 : 150,
            editable: false
        },
        {
            field: 'subject',
            headerName: 'Subject',
            width: isMobile ? 120 : 150,
            editable: false,
            renderCell: (params: GridRenderCellParams<ExtendedStudentMark, string>) => (
                <span>{formatSubjectName(params.row.subject)}</span>
            )
        },
        {
            field: 'term',
            headerName: 'Term',
            width: isMobile ? 100 : 130,
            editable: false,
            renderCell: (params: GridRenderCellParams<ExtendedStudentMark, string>) => (
                <span>{params.row.term}</span>
            )
        },
        {
            field: 'year',
            headerName: 'Year',
            width: isMobile ? 80 : 100,
            editable: false
        },
        {
            field: 'marks',
            headerName: 'Marks (0-100)',
            width: isMobile ? 120 : 140,
            editable: true,
            type: 'number',
            renderCell: (params: GridRenderCellParams<ExtendedStudentMark, string>) => (
                <TextField
                    variant="outlined"
                    size="small"
                    value={params.row.marks || ''}
                    placeholder={params.row.student_admission ?? ''}
                    disabled={params.row.attendance === 'absent'}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (params.row.attendance === 'present') {
                            if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
                                const updatedRow = {
                                    ...params.row,
                                    marks: value
                                };
                                processRowUpdate(updatedRow);
                            }
                        }
                    }}
                    inputProps={{
                        style: {
                            textAlign: 'center',
                            padding: isMobile ? '6px 8px' : '8px 10px',
                            backgroundColor: params.row.attendance === 'absent' ? theme.palette.action.disabledBackground : 'inherit'
                        },
                        min: 0,
                        max: 100,
                        maxLength: 3
                    }}
                    sx={{
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            '&:hover fieldset': {
                                borderColor: params.row.attendance === 'absent' ?
                                    theme.palette.action.disabled :
                                    theme.palette.info.main
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: params.row.attendance === 'absent' ?
                                    theme.palette.action.disabled :
                                    theme.palette.info.main
                            },
                            '&.Mui-disabled': {
                                backgroundColor: theme.palette.action.disabledBackground
                            }
                        },
                    }}
                />
            ),
        },
        {
            field: 'student_grade_value',
            headerName: 'Grade',
            editable: false,
            width: isMobile ? 80 : 100,
            renderCell: (params: GridRenderCellParams<ExtendedStudentMark, string>) => {
                const grade = params.row.student_grade_value;
                if (!grade) return null;

                const getGradeColor = (grade: string) => {
                    switch (grade) {
                        case 'A': return 'success';
                        case 'B': return 'info';
                        case 'C': return 'warning';
                        case 'S': return 'secondary';
                        case 'F': return 'error';
                        default: return 'default';
                    }
                };

                return (
                    <Chip
                        label={grade}
                        color={getGradeColor(grade) as any}
                        size="small"
                        variant="filled"
                    />
                );
            }
        },
        {
            field: 'attendance',
            headerName: 'Attendance',
            width: isMobile ? 130 : 150,
            editable: false,
            renderCell: (params: GridRenderCellParams<ExtendedStudentMark, string>) => (
                <FormControl component="fieldset" sx={{ minWidth: '100%' }}>
                    <RadioGroup
                        row
                        value={params.row.attendance || 'present'}
                        onChange={(e) => handleAttendanceChange(params.row.id, e.target.value as 'present' | 'absent')}
                        sx={{
                            justifyContent: 'center',
                            '& .MuiFormControlLabel-root': {
                                margin: '0 2px',
                                '& .MuiFormControlLabel-label': {
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    fontWeight: 500,
                                }
                            }
                        }}
                    >
                        <FormControlLabel
                            value="present"
                            control={
                                <Radio
                                    size="small"
                                    sx={{
                                        color: theme.palette.success.main,
                                        '&.Mui-checked': { color: theme.palette.success.main },
                                        padding: isMobile ? '4px' : '9px'
                                    }}
                                />
                            }
                            label="P"
                        />
                        <FormControlLabel
                            value="absent"
                            control={
                                <Radio
                                    size="small"
                                    sx={{
                                        color: theme.palette.error.main,
                                        '&.Mui-checked': { color: theme.palette.error.main },
                                        padding: isMobile ? '4px' : '9px'
                                    }}
                                />
                            }
                            label="A"
                        />
                    </RadioGroup>
                </FormControl>
            ),
        },
    ], [theme.palette.info.main, theme.palette.success.main, theme.palette.error.main, theme.palette.action.disabled, theme.palette.action.disabledBackground, formatSubjectName, handleAttendanceChange, processRowUpdate, isMobile]);

    return (
        <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1, overflowX: 'hidden', width: '100%' }}>
                <AppBar position="static" sx={{
                    boxShadow: "none",
                    bgcolor: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                }}>
                    <Navbar title="Add Marks" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                </AppBar>

                <Stack spacing={{ xs: 2, md: 3 }} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 2, md: 3 }, maxWidth: '100%' }}>
                    <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '10px' }}>

                        <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: '10px' }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                            >
                                <Button
                                    variant="contained"
                                    component="label"
                                    startIcon={<UploadFileIcon />}
                                    sx={{ height: 45, width: { xs: '100%', sm: 'auto' } }}
                                    fullWidth={isMobile}
                                >
                                    Upload Excel
                                    <input
                                        type="file"
                                        hidden
                                        accept=".xlsx,.xls"
                                        onChange={handleExcelUpload}
                                    />
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={downloadTemplate}
                                    sx={{ height: 45, width: { xs: '100%', sm: 'auto' } }}
                                    fullWidth={isMobile}
                                >
                                    Download Template
                                </Button>
                                {!isMobile && (
                                    <Typography variant="body2" color="textSecondary">
                                        Upload marks from Excel file (.xlsx, .xls)
                                    </Typography>
                                )}
                            </Stack>
                            {isMobile && (
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                    Upload marks from Excel file (.xlsx, .xls)
                                </Typography>
                            )}
                            {excelError && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    <AlertTitle>Error</AlertTitle>
                                    {excelError}
                                </Alert>
                            )}
                        </Paper>

                        <Dialog
                            open={showExcelPreview}
                            onClose={() => setShowExcelPreview(false)}
                            maxWidth="lg"
                            fullWidth
                            fullScreen={isMobile}
                        >
                            <DialogTitle>Preview Excel Data</DialogTitle>
                            <DialogContent>
                                <Box sx={{ height: isMobile ? 'calc(100vh - 200px)' : 400, width: '100%' }}>
                                    <DataGrid
                                        rows={excelData}
                                        columns={columns}
                                        autoHeight={!isMobile}
                                        initialState={{
                                            pagination: { paginationModel: { pageSize: 10, page: 0 } },
                                        }}
                                        pageSizeOptions={[10]}
                                        disableRowSelectionOnClick
                                        sx={{ mt: 2 }}
                                    />
                                </Box>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setShowExcelPreview(false)}>Cancel</Button>
                                <Button
                                    onClick={handleExcelSubmit}
                                    variant="contained"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : null}
                                >
                                    Upload Marks
                                </Button>
                            </DialogActions>
                        </Dialog>

                        <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: theme.palette.text.primary }}>
                            Filter Student Data
                        </Typography>

                        <Stack spacing={{ xs: 1.5, sm: 2 }}>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 1.5, sm: 2 }}
                                flexWrap="wrap"
                            >
                                <Controller
                                    control={control}
                                    name="selectedGrade"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Student Grade"
                                            variant="outlined"
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: "10px",
                                                    height: "45px",
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <ClassIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        >
                                            {gradeOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="selectedClass"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Class"
                                            variant="outlined"
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: "10px",
                                                    height: "45px",
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <ClassIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        >
                                            {classOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="selectedSubject"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Subject"
                                            variant="outlined"
                                            disabled={!selectedGrade || !selectedClass || subjectOptions.length === 0}
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    height: "45px",
                                                    borderRadius: '10px',
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SubjectIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        >
                                            {subjectOptions.length === 0 ? (
                                                <MenuItem value="" disabled>
                                                    {selectedGrade && selectedClass ? 'No subjects found' : 'Select grade and class first'}
                                                </MenuItem>
                                            ) : (
                                                subjectOptions.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))
                                            )}
                                        </TextField>
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="selectedYear"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Academic Year"
                                            variant="outlined"
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: "10px",
                                                    height: "45px",
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                        >
                                            {yearOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Stack>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 1.5, sm: 2 }}
                                flexWrap="wrap"
                            >
                                <Controller
                                    control={control}
                                    name="selectedExam"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Exam"
                                            variant="outlined"
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    height: "45px",
                                                    borderRadius: "10px",
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <EventIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        >
                                            {examOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="selectedMonth"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Month"
                                            variant="outlined"
                                            disabled={!isMonthFilterEnabled}
                                            sx={{
                                                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 auto' },
                                                minWidth: { xs: '100%', sm: 150 },
                                                maxWidth: { md: 250 },
                                                '& .MuiOutlinedInput-root': {
                                                    height: "45px",
                                                    borderRadius: '10px',
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalendarMonthIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        >
                                            {monthOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Stack>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 1.5, sm: 2 }}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                            >
                                <Controller
                                    control={control}
                                    name="searchQuery"
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Search Students"
                                            placeholder="Search by name or admission number"
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                flexGrow: 1,
                                                width: '100%',
                                                maxWidth: { sm: 460 },
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    height: '45px',
                                                    bgcolor: theme.palette.background.paper,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                                }
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start" sx={{ mr: 1 }}>
                                                        <SearchIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    )}
                                />
                                <Button
                                    variant="outlined"
                                    onClick={handleClearFilters}
                                    fullWidth={isMobile}
                                    sx={{
                                        px: 3,
                                        py: 1,
                                        borderRadius: '10px',
                                        borderColor: theme.palette.primary.main,
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            borderColor: theme.palette.primary.dark,
                                            color: theme.palette.primary.dark,
                                        },
                                        minWidth: { sm: 'auto' }
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </Stack>
                        </Stack>

                        {(modifiedCount > 0 || !isFormValid) && (
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mt: 2 }}>
                                {modifiedCount > 0 && (
                                    <Chip
                                        label={`${modifiedCount} marks modified`}
                                        color="info"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {!isFormValid && (
                                    <Chip
                                        label={isMobile ? "Complete fields" : "Complete required fields to enable submission"}
                                        color="warning"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        )}
                    </Paper>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Paper elevation={2} sx={{
                            mt: { xs: 2, md: 3 },
                            p: { xs: 1, sm: 2 },
                            borderRadius: theme.shape.borderRadius,
                            boxShadow: theme.shadows[3],
                            bgcolor: theme.palette.background.paper,
                            overflowX: 'auto'
                        }}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 1 }}>
                                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ color: theme.palette.text.primary }}>
                                    Student Marks {filteredStudents.length > 0 && `(${filteredStudents.length})`}
                                </Typography>
                                {modifiedCount > 0 && (
                                    <Tooltip title="Number of students with modified marks or attendance">
                                        <Chip
                                            label={`${modifiedCount} unsaved`}
                                            color="warning"
                                            size="small"
                                            variant="filled"
                                        />
                                    </Tooltip>
                                )}
                            </Box>

                            {filteredStudents.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                                        {!selectedGrade || !selectedClass || !selectedYear ?
                                            'Please select grade, class, and year to view students' :
                                            searchQuery ? 'No students found matching your search' :
                                                'No students found for the selected criteria'
                                        }
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ height: { xs: 500, md: 400 }, width: '100%' }}>
                                    <DataGrid
                                        rows={filteredStudents}
                                        columns={columns}
                                        getRowId={(row) => row.id}
                                        processRowUpdate={processRowUpdate}
                                        onProcessRowUpdateError={(error) => {
                                            console.error('Row update error:', error);
                                            showSnackbar('Error updating student marks', 'error');
                                        }}
                                        initialState={{
                                            pagination: { paginationModel: { page: 0, pageSize: isMobile ? 5 : 10 } },
                                        }}
                                        pageSizeOptions={isMobile ? [5, 10] : [5, 10, 25, 50]}
                                        disableRowSelectionOnClick
                                        loading={loading}
                                        sx={{
                                            '.MuiDataGrid-footerContainer': {
                                                backgroundColor: theme.palette.background.paper,
                                                color: theme.palette.text.secondary,
                                            },
                                            '.MuiDataGrid-row:nth-of-type(odd)': {
                                                backgroundColor: theme.palette.background.paper,
                                            },
                                            '.MuiDataGrid-row:nth-of-type(even)': {
                                                backgroundColor: theme.palette.background.paper,
                                            },
                                            '.MuiDataGrid-cell': {
                                                borderColor: theme.palette.divider,
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                            },
                                            '.MuiDataGrid-columnHeaders': {
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                            },
                                            '.MuiDataGrid-virtualScrollerContent': {
                                                '& .MuiDataGrid-row': {
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.action.hover,
                                                    },
                                                },
                                            },
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderRadius: theme.shape.borderRadius,
                                        }}
                                    />
                                </Box>
                            )}

                            {filteredStudents.length > 0 && (
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    justifyContent="center"
                                    spacing={2}
                                    sx={{ mt: 3 }}
                                >
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmitMarks}
                                        disabled={loading || !isFormValid || modifiedCount === 0}
                                        startIcon={<SaveIcon />}
                                        fullWidth={isMobile}
                                        sx={{
                                            bgcolor: theme.palette.primary.main,
                                            '&:hover': { bgcolor: theme.palette.primary.dark },
                                            color: theme.palette.primary.contrastText,
                                            px: 4,
                                            py: 1.2,
                                            borderRadius: theme.shape.borderRadius,
                                            minWidth: { sm: 180 },
                                        }}
                                    >
                                        {loading ? 'Submitting...' : `Submit ${modifiedCount} ${isMobile ? '' : 'Records'}`}
                                    </Button>

                                    {modifiedCount > 0 && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleClearChanges}
                                            startIcon={<ClearIcon />}
                                            fullWidth={isMobile}
                                            sx={{
                                                borderColor: theme.palette.warning.main,
                                                color: theme.palette.warning.main,
                                                '&:hover': {
                                                    borderColor: theme.palette.warning.dark,
                                                    color: theme.palette.warning.dark,
                                                },
                                                px: 3,
                                                py: 1.2,
                                                borderRadius: theme.shape.borderRadius,
                                            }}
                                        >
                                            Clear Changes
                                        </Button>
                                    )}
                                </Stack>
                            )}
                        </Paper>
                    )}
                </Stack>
                <Footer />
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{
                    vertical: isMobile ? 'top' : 'bottom',
                    horizontal: isMobile ? 'center' : 'right'
                }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                    elevation={6}
                    variant="filled"
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TeacherDashboard;