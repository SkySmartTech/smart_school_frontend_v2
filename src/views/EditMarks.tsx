import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, Controller } from "react-hook-form";
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
  useMediaQuery,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowId } from "@mui/x-data-grid";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import {
  submitStudentMarks,
  fetchGradesFromApi,
  fetchClassesFromApi,
  fetchAdmissionData,
  fetchFilteredMarks,
  fetchYearsFromApi,
  calculateGradeLocal,
  type StudentMark,
} from "../api/editMarks";

import ClassIcon from "@mui/icons-material/Class";
import SubjectIcon from "@mui/icons-material/Subject";
import EventIcon from "@mui/icons-material/Event";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import SaveIcon from "@mui/icons-material/Save";

import useTeacherProfile from "../hooks/useTeacherProfile";
import Footer from "../components/Footer";

const examOptions = [
  { label: "First Term", value: "First Term" },
  { label: "Second Term", value: "Second Term" },
  { label: "Third Term", value: "Third Term" },
  { label: "Monthly Test", value: "Monthly" },
];

const monthOptions = [
  { label: "January", value: "January" },
  { label: "February", value: "February" },
  { label: "March", value: "March" },
  { label: "April", value: "April" },
  { label: "May", value: "May" },
  { label: "June", value: "June" },
  { label: "July", value: "July" },
  { label: "August", value: "August" },
  { label: "September", value: "September" },
  { label: "October", value: "October" },
  { label: "November", value: "November" },
  { label: "December", value: "December" },
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
  attendance?: "present" | "absent";
  status?: boolean;
}

const TeacherDashboard: React.FC = () => {
  const { data: teacherProfile, isLoading: profileLoading } =
    useTeacherProfile();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gradeOptions, setGradeOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [classOptions, setClassOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [students, setStudents] = useState<ExtendedStudentMark[]>([]);
  const [admissionData, setAdmissionData] = useState<AdmissionData[]>([]);
  const [modifiedMarks, setModifiedMarks] = useState<
    Record<GridRowId, Partial<ExtendedStudentMark>>
  >({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<ExtendedStudentMark | null>(
    null
  );
  const [editValues, setEditValues] = useState<{
    marks: string;
    marksGrade: string;
    attendance: "present" | "absent";
  }>({ marks: "", marksGrade: "", attendance: "present" });

  const admissionDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<string>("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { control, watch, reset } = useForm<FilterFormData>({
    defaultValues: {
      selectedGrade: "",
      selectedClass: "",
      selectedSubject: "",
      selectedExam: "",
      selectedMonth: "",
      selectedYear: "",
      searchQuery: "",
    },
  });

  const formValues = watch();
  const {
    selectedGrade,
    selectedClass,
    selectedSubject,
    selectedExam,
    selectedMonth,
    selectedYear,
    searchQuery,
  } = formValues;
  const isMonthFilterEnabled = selectedExam === "Monthly";

  const formatSubjectName = useCallback((subject: string): string => {
    if (!subject) return subject;
    return subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
  }, []);

  const formatExamName = useCallback((exam: string): string => {
    const examMap: Record<string, string> = {
      "First Term": "First Term",
      "Second Term": "Second Term",
      "Third Term": "Third Term",
      "Monthly Term": "Monthly",
    };
    return examMap[exam] || exam;
  }, []);

  const subjectOptions = useMemo(() => {
    if (
      !teacherProfile?.teacher_data ||
      !Array.isArray(teacherProfile.teacher_data) ||
      !selectedGrade ||
      !selectedClass
    ) {
      return [];
    }

    const subjects = teacherProfile.teacher_data
      .filter(
        (teacher) =>
          teacher.teacherGrade === selectedGrade &&
          teacher.teacherClass === selectedClass
      )
      .map((teacher) => ({
        label: formatSubjectName(teacher.subject),
        value: teacher.subject,
      }));

    return subjects.filter(
      (subject, index, self) =>
        index ===
        self.findIndex(
          (s) => s.value.toLowerCase() === subject.value.toLowerCase()
        )
    );
  }, [
    teacherProfile?.teacher_data,
    selectedGrade,
    selectedClass,
    formatSubjectName,
  ]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.student_name.toLowerCase().includes(query) ||
        student.student_admission.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const isFormValid = useMemo(() => {
    return (
      selectedGrade &&
      selectedClass &&
      selectedSubject &&
      selectedExam &&
      selectedYear &&
      (selectedExam !== "Monthly" || selectedMonth)
    );
  }, [
    selectedGrade,
    selectedClass,
    selectedSubject,
    selectedExam,
    selectedYear,
    selectedMonth,
  ]);

  const modifiedCount = useMemo(() => {
    return Object.values(modifiedMarks).filter(
      (mark) =>
        (mark.marks !== undefined && mark.marks !== "") ||
        mark.attendance !== undefined
    ).length;
  }, [modifiedMarks]);

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error" | "info" | "warning") => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
    },
    []
  );

  const calculateGrade = useCallback((marks: number): string => {
    return calculateGradeLocal(marks);
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
        `Failed to load grades: ${
          error instanceof Error ? error.message : "An unknown error occurred"
        }`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [profileLoading, showSnackbar]);

  const fetchClasses = useCallback(
    async (grade: string) => {
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
          `Failed to load classes: ${
            error instanceof Error ? error.message : "An unknown error occurred"
          }`,
          "error"
        );
      }
    },
    [showSnackbar]
  );

  const fetchYears = useCallback(async () => {
    try {
      const years = await fetchYearsFromApi();
      setYearOptions(years);
    } catch (error) {
      console.error("Failed to fetch years:", error);
      showSnackbar(
        `Failed to load years: ${
          error instanceof Error ? error.message : "An unknown error occurred"
        }`,
        "error"
      );
    }
  }, [showSnackbar]);

  const fetchAdmissionDataHandler = useCallback(
    async (grade: string, classValue: string, year: string) => {
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
        const data = await fetchAdmissionData(grade, classValue, "");
        setAdmissionData(data);
        lastFetchParamsRef.current = cacheKey;

        const initialStudents: ExtendedStudentMark[] = data.map(
          (item, index) => ({
            id: index + 1,
            student_admission: item.student_admission,
            student_name: item.student_name,
            student_grade: grade,
            student_class: classValue,
            subject: selectedSubject ? formatSubjectName(selectedSubject) : "",
            term: selectedExam || "",
            marks: "",
            student_grade_value: "",
            month: isMonthFilterEnabled ? selectedMonth : undefined,
            year: year,
            attendance: "present",
            status: true,
          })
        );

        setStudents(initialStudents);
        setModifiedMarks({});
      } catch (error) {
        console.error("Failed to fetch admission data:", error);
        showSnackbar(
          `Failed to load admission data: ${
            error instanceof Error ? error.message : "An unknown error occurred"
          }`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      selectedSubject,
      selectedExam,
      selectedMonth,
      isMonthFilterEnabled,
      showSnackbar,
      formatSubjectName,
    ]
  );

  // Fetch marks from server when Grade/Class/Year/Term/Subject filters are all provided
  const fetchFilteredMarksHandler = useCallback(
    async (
      grade: string,
      classValue: string,
      year: string,
      term: string,
      subject: string
    ) => {
      if (!grade || !classValue || !year || !term || !subject) return;

      const cacheKey = `${grade}-${classValue}-${year}-${term}-${subject}`;
      if (lastFetchParamsRef.current === cacheKey) return;

      try {
        setLoading(true);
        const data = await fetchFilteredMarks(
          grade,
          classValue,
          year,
          term,
          subject
        );
        lastFetchParamsRef.current = cacheKey;

        const transformed: ExtendedStudentMark[] = data.map((item, idx) => {
          const it: any = item as any;
          return {
            id: it.id ?? idx + 1,
            student_admission:
              it.student_admission ?? it.studentAdmissionNo ?? "",
            student_name: it.student_name ?? it.studentName ?? "",
            student_grade: it.student_grade ?? "",
            student_class: it.student_class ?? classValue,
            subject: it.subject ?? subject,
            term: it.term ?? term,
            marks: it.marks ?? "",
            student_grade_value: it.student_grade_value ?? it.marksGrade ?? "",
            month: it.month ?? undefined,
            year: it.year ?? year,
            attendance:
              it.status === false ||
              it.status === 0 ||
              it.status === "0" ||
              it.status === "absent"
                ? "absent"
                : "present",
            status: it.status === 1 || it.status === true || it.status === "1",
          } as ExtendedStudentMark;
        });

        setStudents(transformed);
        setModifiedMarks({});
      } catch (error) {
        console.error("Failed to fetch filtered marks:", error);
        showSnackbar(
          `Failed to load marks: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchFilteredMarks, showSnackbar]
  );

  const processRowUpdate = useCallback(
    (newRow: ExtendedStudentMark) => {
      let grade = "";
      if (newRow.marks !== "") {
        const marks = parseInt(newRow.marks, 10);
        if (isNaN(marks) || marks < 0 || marks > 100) {
          showSnackbar("Please enter valid marks between 0 and 100", "warning");
          return students.find((s) => s.id === newRow.id) || newRow;
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
          status: updatedRow.attendance === "present" ? true : false,
        },
      }));

      return updatedRow;
    },
    [students, calculateGrade, showSnackbar]
  );

  // Open edit dialog for a single student
  const openEditDialog = useCallback((student: ExtendedStudentMark) => {
    setEditStudent(student);
    setEditValues({
      marks: student.marks ?? "",
      marksGrade: student.student_grade_value ?? "",
      attendance: student.attendance ?? "present",
    });
    setEditOpen(true);
  }, []);

  const handleEditChange = useCallback(
    (field: "marks" | "marksGrade" | "attendance", value: string) => {
      if (field === "marks") {
        const marksNum = parseInt(value, 10);
        let grade = "";
        if (value !== "" && !isNaN(marksNum)) {
          grade = calculateGradeLocal(marksNum);
        }
        setEditValues((prev) => ({
          ...prev,
          marks: value,
          marksGrade: grade,
        }));
      } else if (field === "attendance") {
        // When Absent is selected, clear marks and grade fields
        if (value === "absent") {
          setEditValues((prev) => ({
            ...prev,
            attendance: "absent" as const,
            marks: "",
            marksGrade: "",
          }));
        } else {
          setEditValues((prev) => ({
            ...prev,
            attendance: "present" as const,
          }));
        }
      } else {
        setEditValues((prev) => ({ ...prev, [field]: value } as any));
      }
    },
    []
  );

  const handleEditSubmit = useCallback(async () => {
    if (!editStudent) return;
    setLoading(true);

    const payload: Partial<ExtendedStudentMark>[] = [
      {
        id: editStudent.id,
        student_admission: editStudent.student_admission,
        student_name: editStudent.student_name,
        student_grade: editStudent.student_grade || selectedGrade || "",
        student_class: editStudent.student_class || selectedClass || "",
        subject: editStudent.subject || formatSubjectName(selectedSubject),
        term: editStudent.term || selectedExam || "",
        month: isMonthFilterEnabled ? selectedMonth : "0",
        marks: editValues.marks || "0",
        student_grade_value:
          editValues.marksGrade || calculateGrade(Number(editValues.marks)),
        year: editStudent.year || selectedYear || "",
        status: editValues.attendance === "present",
      },
    ];

    try {
      await submitStudentMarks(payload);
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editStudent.id
            ? {
                ...s,
                marks: editValues.marks,
                student_grade_value: editValues.marksGrade,
                attendance: editValues.attendance,
                status: editValues.attendance === "present",
              }
            : s
        )
      );
      setEditOpen(false);
      setEditStudent(null);
      showSnackbar("Student record updated", "success");
    } catch (error) {
      console.error("Failed to update student:", error);
      showSnackbar(
        `Failed to update: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [
    editStudent,
    editValues,
    selectedGrade,
    selectedClass,
    selectedSubject,
    selectedExam,
    selectedMonth,
    selectedYear,
    isMonthFilterEnabled,
    showSnackbar,
    calculateGrade,
  ]);

  const handleSubmitMarks = useCallback(async () => {
    if (!isFormValid) {
      showSnackbar(
        "Please fill all required fields before submitting",
        "warning"
      );
      return;
    }

    setLoading(true);
    const marksToSubmit: Partial<ExtendedStudentMark>[] = Object.entries(
      modifiedMarks
    )
      .filter(
        ([_, mark]) =>
          (mark.marks !== undefined && mark.marks !== "") ||
          mark.attendance !== undefined
      )
      .map(([id, mark]) => {
        const student = students.find((s) => s.id.toString() === id);
        if (!student) {
          console.error(`Student not found for id ${id}`);
          return null;
        }

        return {
          id: parseInt(id as string),
          student_admission:
            mark.student_admission || student.student_admission,
          student_name: student.student_name,
          student_grade: selectedGrade,
          student_class: selectedClass,
          subject: formatSubjectName(selectedSubject),
          term: formatExamName(selectedExam),
          month: isMonthFilterEnabled ? selectedMonth : "0",
          marks: mark.marks || "0",
          student_grade_value: mark.student_grade_value || "Absent",
          year: selectedYear,
          attendance: mark.attendance || student.attendance || "present",
          status:
            mark.status !== undefined
              ? mark.status
              : mark.attendance === "present"
              ? true
              : false,
        };
      })
      .filter((mark): mark is NonNullable<typeof mark> => mark !== null);

    if (marksToSubmit.length === 0) {
      showSnackbar("No marks to submit.", "info");
      setLoading(false);
      return;
    }

    try {
      await submitStudentMarks(marksToSubmit);
      showSnackbar(
        `Successfully submitted marks for ${marksToSubmit.length} students!`,
        "success"
      );
      setModifiedMarks({});
    } catch (error) {
      console.error("Failed to submit marks:", error);
      showSnackbar(
        `Failed to submit marks: ${
          error instanceof Error ? error.message : "An unknown error occurred"
        }`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [
    isFormValid,
    modifiedMarks,
    students,
    selectedGrade,
    selectedClass,
    selectedSubject,
    selectedExam,
    selectedMonth,
    selectedYear,
    isMonthFilterEnabled,
    showSnackbar,
    formatSubjectName,
    formatExamName,
  ]);

  const handleCloseSnackbar = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") {
        return;
      }
      setSnackbarOpen(false);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    reset();
    setAdmissionData([]);
    setStudents([]);
    setModifiedMarks({});
    setClassOptions([]);
    lastFetchParamsRef.current = "";
  }, [reset]);

  const handleClearChanges = useCallback(() => {
    setModifiedMarks({});
    setStudents((prev) =>
      prev.map((student) => ({
        ...student,
        marks: "",
        student_grade_value: "",
        attendance: "present",
        status: true,
      }))
    );
    showSnackbar("All unsaved marks cleared", "info");
  }, [showSnackbar]);

  useEffect(() => {
    if (!profileLoading && gradeOptions.length === 0) {
      fetchGrades();
      fetchYears();
    }
  }, [profileLoading, fetchGrades, fetchYears]);

  useEffect(() => {
    fetchClasses(selectedGrade);
  }, [selectedGrade]);

  useEffect(() => {
    if (
      selectedGrade &&
      selectedClass &&
      selectedSubject &&
      subjectOptions.length > 0
    ) {
      const availableSubjects = subjectOptions.map((s) => s.value);
      if (!availableSubjects.includes(selectedSubject)) {
        reset({
          ...formValues,
          selectedSubject: "",
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
        // If subject and term are selected, fetch actual marks; otherwise fetch admission list
        if (selectedSubject && selectedExam) {
          fetchFilteredMarksHandler(
            selectedGrade,
            selectedClass,
            selectedYear,
            selectedExam,
            selectedSubject
          );
        } else {
          fetchAdmissionDataHandler(selectedGrade, selectedClass, selectedYear);
        }
      }, 300);
    } else {
      setAdmissionData([]);
      setStudents([]);
      lastFetchParamsRef.current = "";
    }

    return () => {
      if (admissionDataTimeoutRef.current) {
        clearTimeout(admissionDataTimeoutRef.current);
      }
    };
  }, [selectedGrade, selectedClass, selectedYear]);

  useEffect(() => {
    if (admissionData.length > 0) {
      setStudents((prevStudents) =>
        prevStudents.map((student) => ({
          ...student,
          subject: selectedSubject ? formatSubjectName(selectedSubject) : "",
          term: selectedExam || "",
          month: isMonthFilterEnabled ? selectedMonth : undefined,
          year: selectedYear || "",
          status: student.attendance === "present" ? true : false,
        }))
      );
    }
  }, [
    selectedSubject,
    selectedExam,
    selectedMonth,
    isMonthFilterEnabled,
    selectedYear,
    admissionData.length,
    formatSubjectName,
  ]);

  // Simplified table columns: Admission No, Student Name, Marks, Grade, Attendance, Action
  const columns: GridColDef<ExtendedStudentMark>[] = useMemo(
    () => [
      {
        field: "student_admission",
        headerName: "Admission No",
        flex: 1,
        editable: false,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "student_name",
        headerName: "Student Name",
        flex: 1,
        editable: false,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "marks",
        headerName: "Marks",
        flex: 1,
        editable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <span style={{ width: "100%", textAlign: "center" }}>
            {params.row.marks ?? ""}
          </span>
        ),
      },
      {
        field: "student_grade_value",
        headerName: "Grade",
        flex: 1,
        editable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const grade: string | undefined = params.row.student_grade_value;
          if (!grade) return null;

          const getColor = (g: string) => {
            switch ((g || "").toString().toUpperCase()) {
              case "A":
                return "success";
              case "B":
                return "info";
              case "C":
                return "warning";
              case "S":
                return "secondary";
              case "F":
                return "error";
              default:
                return "default";
            }
          };

          const color = getColor(grade);
          return (
            <Chip
              label={grade}
              size="small"
              color={color as any}
              sx={{ fontWeight: 700 }}
              aria-label={`grade-${grade}`}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Attendance",
        flex: 1,
        editable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const present = !!params.row.status;
          return (
            <Chip
              label={present ? "Present" : "Absent"}
              size="small"
              color={present ? ("success" as any) : ("error" as any)}
              sx={{ fontWeight: 700 }}
              aria-label={present ? "attendance-present" : "attendance-absent"}
            />
          );
        },
      },
      {
        field: "action",
        headerName: "Action",
        flex: 1,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Button
            variant="contained"
            size="small"
            onClick={() => openEditDialog(params.row)}
          >
            Edit
          </Button>
        ),
      },
    ],
    [isMobile, openEditDialog]
  );

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <Box sx={{ flexGrow: 1, overflowX: "hidden", width: "100%" }}>
        <AppBar
          position="static"
          sx={{
            boxShadow: "none",
            bgcolor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
          }}
        >
          <Navbar
            title="Edit Marks"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Stack
          spacing={{ xs: 2, md: 3 }}
          sx={{ px: { xs: 1, sm: 2 }, py: { xs: 2, md: 3 }, maxWidth: "100%" }}
        >
          <Paper
            elevation={2}
            sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "10px" }}
          >
            <Paper
              elevation={2}
              sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: "10px" }}
            >
              {/* Filter Form Grid - Responsive and Justified */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr', // 1 column on mobile
                    sm: '1fr 1fr', // 2 columns on small screens
                    md: 'repeat(4, 1fr)', // 4 columns on medium screens
                  },
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                {/* Grade Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '1', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedGrade"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Student Grade"
                        variant="outlined"
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>

                {/* Class Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '2', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedClass"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Class"
                        variant="outlined"
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>

                {/* Subject Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '1', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedSubject"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Subject"
                        variant="outlined"
                        fullWidth
                        size="small"
                        disabled={
                          !selectedGrade ||
                          !selectedClass ||
                          subjectOptions.length === 0
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                            {selectedGrade && selectedClass
                              ? 'No subjects found'
                              : 'Select grade and class first'}
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
                </Box>

                                {/* Exam Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '1', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedExam"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Exam"
                        variant="outlined"
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>

                {/* Year Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '2', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedYear"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Academic Year"
                        variant="outlined"
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>



                {/* Month Dropdown */}
                <Box sx={{ gridColumn: { xs: '1', sm: '2', md: 'auto' } }}>
                  <Controller
                    control={control}
                    name="selectedMonth"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Month"
                        variant="outlined"
                        fullWidth
                        size="small"
                        disabled={!isMonthFilterEnabled}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>
              </Box>

              {/* Search and Clear Filters Row */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '2fr 1fr',
                  },
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'center',
                }}
              >
                {/* Search Field */}
                <Box>
                  <Controller
                    control={control}
                    name="searchQuery"
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Search Students"
                        placeholder="Search by name or admission number"
                        variant="outlined"
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: theme.palette.background.paper,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.divider,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
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
                </Box>

                {/* Clear Filters Button */}
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    fullWidth
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
                      height: '40px', // Match text field height
                    }}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </Box>

              {/* Status Chips */}
              {(modifiedCount > 0 || !isFormValid) && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    mt: 2,
                  }}
                >
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
                      label={
                        isMobile
                          ? 'Complete fields'
                          : 'Complete required fields to enable submission'
                      }
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </Paper>

            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "300px",
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Paper
                elevation={2}
                sx={{
                  mt: { xs: 2, md: 3 },
                  p: { xs: 1, sm: 2 },
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[3],
                  bgcolor: theme.palette.background.paper,
                  overflowX: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    mb: 2,
                    gap: 1,
                  }}
                >
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Student Marks{" "}
                    {filteredStudents.length > 0 &&
                      `(${filteredStudents.length})`}
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
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ px: 2 }}
                    >
                      {!selectedGrade || !selectedClass || !selectedYear
                        ? "Please select grade, class, and year to view students"
                        : searchQuery
                        ? "No students found matching your search"
                        : "No students found for the selected criteria"}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ height: { xs: 500, md: 400 }, width: "100%" }}>
                    <DataGrid
                      rows={filteredStudents}
                      columns={columns}
                      getRowId={(row) => row.id}
                      processRowUpdate={processRowUpdate}
                      onProcessRowUpdateError={(error) => {
                        console.error("Row update error:", error);
                        showSnackbar("Error updating student marks", "error");
                      }}
                      initialState={{
                        pagination: {
                          paginationModel: {
                            page: 0,
                            pageSize: isMobile ? 5 : 10,
                          },
                        },
                      }}
                      pageSizeOptions={isMobile ? [5, 10] : [5, 10, 25, 50]}
                      disableRowSelectionOnClick
                      loading={loading}
                      sx={{
                        ".MuiDataGrid-footerContainer": {
                          backgroundColor: theme.palette.background.paper,
                          color: theme.palette.text.secondary,
                        },
                        ".MuiDataGrid-row:nth-of-type(odd)": {
                          backgroundColor: theme.palette.background.paper,
                        },
                        ".MuiDataGrid-row:nth-of-type(even)": {
                          backgroundColor: theme.palette.background.paper,
                        },
                        ".MuiDataGrid-cell": {
                          borderColor: theme.palette.divider,
                          fontSize: isMobile ? "0.75rem" : "0.875rem",
                        },
                        ".MuiDataGrid-columnHeaders": {
                          fontSize: isMobile ? "0.75rem" : "0.875rem",
                        },
                        ".MuiDataGrid-virtualScrollerContent": {
                          "& .MuiDataGrid-row": {
                            "&:hover": {
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
                    direction={{ xs: "column", sm: "row" }}
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
                        "&:hover": { bgcolor: theme.palette.primary.dark },
                        color: theme.palette.primary.contrastText,
                        px: 4,
                        py: 1.2,
                        borderRadius: theme.shape.borderRadius,
                        minWidth: { sm: 180 },
                      }}
                    >
                      {loading
                        ? "Submitting..."
                        : `Submit ${modifiedCount} ${
                            isMobile ? "" : "Records"
                          }`}
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
                          "&:hover": {
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
          </Paper>
        </Stack>

        {/* Edit single student dialog */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Student Marks</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              {/* Admission No */}
              <TextField
                label="Admission No"
                value={editStudent?.student_admission ?? ""}
                disabled
                fullWidth
              />
              
              {/* Student Name */}
              <TextField
                label="Student Name"
                value={editStudent?.student_name ?? ""}
                disabled
                fullWidth
              />
              
              {/* Grade */}
              <TextField
                label="Grade"
                value={editStudent?.student_grade ?? ""}
                disabled
                fullWidth
              />
              
              {/* Class */}
              <TextField
                label="Class"
                value={editStudent?.student_class ?? ""}
                disabled
                fullWidth
              />
              
              {/* Year */}
              <TextField
                label="Year"
                value={selectedYear}
                disabled
                fullWidth
              />
              
              {/* Term */}
              <TextField
                label="Term"
                value={selectedExam}
                disabled
                fullWidth
              />
              
              {/* Month (only shown if Monthly exam) */}
              {isMonthFilterEnabled && (
                <TextField
                  label="Month"
                  value={selectedMonth}
                  disabled
                  fullWidth
                />
              )}
              
              {/* Subject */}
              <TextField
                label="Subject"
                value={selectedSubject ? formatSubjectName(selectedSubject) : ""}
                disabled
                fullWidth
              />
              
              {/* Medium */}
              <TextField
                label="Medium"
                value="English"
                disabled
                fullWidth
              />
              
              {/* Attendance Radio Buttons */}
              <FormControl>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Attendance Status
                </Typography>
                <RadioGroup
                  row
                  value={editValues.attendance}
                  onChange={(e) =>
                    handleEditChange("attendance", e.target.value)
                  }
                >
                  <FormControlLabel
                    value="present"
                    control={<Radio />}
                    label="Present"
                  />
                  <FormControlLabel
                    value="absent"
                    control={<Radio />}
                    label="Absent"
                  />
                </RadioGroup>
              </FormControl>
              
              {/* Marks (disabled when Absent) */}
              <TextField
                label="Marks (0-100)"
                type="number"
                value={editValues.marks}
                onChange={(e) => handleEditChange("marks", e.target.value)}
                disabled={editValues.attendance === "absent"}
                fullWidth
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                helperText={editValues.attendance === "absent" ? "Locked when marked Absent" : ""}
              />
              
              {/* Grade (read-only, auto-calculated) */}
              <TextField
                label="Grade"
                value={editValues.marksGrade}
                disabled={editValues.attendance === "absent"}
                fullWidth
                helperText={editValues.attendance === "absent" ? "Locked when marked Absent" : "Auto-calculated from marks"}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleEditSubmit}
              startIcon={<SaveIcon />}
              disabled={!selectedYear || !selectedExam}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Footer />
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{
          vertical: isMobile ? "top" : "bottom",
          horizontal: isMobile ? "center" : "right",
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
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