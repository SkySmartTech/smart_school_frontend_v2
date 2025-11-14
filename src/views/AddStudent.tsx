import { useState, useEffect, useRef } from "react";

interface GradeOption {
  id: string;
  grade: string;
}

import {
  Box,
  AppBar,
  CssBaseline,
  useTheme,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Checkbox,
  useMediaQuery,
} from "@mui/material";
import { Close, Add, Delete } from "@mui/icons-material";

import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import {
  promoteStudents,
  getAvailableGrades,
  getAvailableClasses,
  getAvailableYears,
  fetchClassStudents,
  type Student,
  type PromoteStudentsRequest
} from "../api/studentApi";

import * as XLSX from "xlsx";

const AddStudent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const theme = useTheme();
  useCustomTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter states
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Available options
  const [years, setYears] = useState<string[]>([]);
  const [grades, setGrades] = useState<(string | GradeOption)[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  // Students data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

  // Current year filter in dialog
  const [currentYearFilter, setCurrentYearFilter] = useState("");
  const [currentGradeFilter, setCurrentGradeFilter] = useState("");
  const [currentClassFilter, setCurrentClassFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Next year details
  const [nextYear, setNextYear] = useState("");
  const [nextGrade, setNextGrade] = useState("");
  const [nextClass, setNextClass] = useState("");

  // Excel upload states
  const [excelUploaded, setExcelUploaded] = useState(false);
  const [uploadedStudents, setUploadedStudents] = useState<Student[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Load available grade options and years on mount
  useEffect(() => {
    void loadAvailableGrades();
    void loadAvailableYearsData();
  }, []);

  // Load students when filters change (year, grade, class)
  useEffect(() => {
    if (year && grade && classFilter) {
      void loadStudents();
    } else {
      setStudents([]);
    }
  }, [year, grade, classFilter]);

  // Load classes when grade changes
  useEffect(() => {
    if (grade) {
      const loadClassesForGrade = async () => {
        try {
          const classesData = await getAvailableClasses(grade);
          setClasses(classesData);
        } catch (error) {
          showSnackbar("Failed to load classes", "error");
          setClasses([]);
        }
      };
      void loadClassesForGrade();
    } else {
      setClasses([]);
      setClassFilter("");
    }
  }, [grade]);

  useEffect(() => {
    if (nextGrade) {
      const loadClassesForNextGrade = async () => {
        try {
          const classesData = await getAvailableClasses(nextGrade);
          setClasses(classesData);
        } catch (error) {
          showSnackbar("Failed to load classes for next grade", "error");
        }
      };
      void loadClassesForNextGrade();
    }
  }, [nextGrade]);

  const loadAvailableGrades = async () => {
    try {
      const gradesData = await getAvailableGrades();
      setGrades(gradesData);
    } catch (error) {
      showSnackbar("Failed to load available grades", "error");
    }
  };

  const loadAvailableYearsData = async () => {
    try {
      const yearsData = await getAvailableYears();
      // Extract year values from objects if they contain a year property
      const extractedYears = yearsData.map((item: any) => 
        typeof item === 'string' ? item : item.year
      );
      setYears(extractedYears);
    } catch (error) {
      showSnackbar("Failed to load available years", "error");
    }
  };

  const loadStudents = async () => {
    if (!year || !grade || !classFilter) return;

    setLoading(true);
    try {
      const studentsData = await fetchClassStudents(year, grade, classFilter);
      setStudents(studentsData);
    } catch (error) {
      showSnackbar("Failed to load students", "error");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setCurrentYearFilter(year);
    setCurrentGradeFilter(grade);
    setCurrentClassFilter(classFilter);
    setSelectedStudents([]);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStudents([]);
    setSearchTerm("");
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudents(prev => {
      if (prev.some(s => s.id === student.id)) return prev;
      return [...prev, student];
    });
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handlePromoteStudents = async () => {
    if (selectedStudents.length === 0) {
      showSnackbar("Please select at least one student", "error");
      return;
    }

    if (!nextYear || !nextGrade || !nextClass) {
      showSnackbar("Please select next year details", "error");
      return;
    }

    try {
      const request: PromoteStudentsRequest = {
        students: selectedStudents.map(student => ({
          name: student.name,
          studentAdmissionNo: student.admissionNo,
          year: nextYear,
          studentGrade: nextGrade,
          studentClass: nextClass
        }))
      };

      const result = await promoteStudents(request);

      if (result.success) {
        showSnackbar(result.message, "success");
        handleCloseDialog();
        void loadStudents();
        setExcelUploaded(false);
        setUploadedStudents([]);
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      showSnackbar("Failed to promote students", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredStudents = students.filter(student =>
    (!currentYearFilter || student.year === currentYearFilter) &&
    (!currentGradeFilter || student.grade === currentGradeFilter) &&
    (!currentClassFilter || student.class === currentClassFilter) &&
    (!searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
    ) &&
    !selectedStudents.some(selected => selected.id === student.id)
  );

  const gradeToValue = (g: any) => {
    if (!g && g !== 0) return "";
    if (typeof g === "string") return g;
    return String(g.grade ?? g.name ?? g.value ?? JSON.stringify(g));
  };

  const dialogDisplayStudents = (excelUploaded ? uploadedStudents : filteredStudents)
    .filter(student => !selectedStudents.some(s => s.id === student.id))
    .filter(student =>
      !searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const isAllSelected = dialogDisplayStudents.length > 0 && dialogDisplayStudents.every(s => selectedStudents.some(sel => sel.id === s.id));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const toAdd = dialogDisplayStudents.filter(s => !existingIds.has(s.id));
        return [...prev, ...toAdd];
      });
    } else {
      setSelectedStudents(prev => prev.filter(s => !dialogDisplayStudents.some(ds => ds.id === s.id)));
    }
  };

  const handleSelectAllAction = () => {
    const unselectedStudents = dialogDisplayStudents.filter(
      student => !selectedStudents.some(s => s.id === student.id)
    );

    if (unselectedStudents.length > 0) {
      setSelectedStudents(prev => [...prev, ...unselectedStudents]);
    } else {
      setSelectedStudents(prev =>
        prev.filter(selected =>
          !dialogDisplayStudents.some(ds => ds.id === selected.id)
        )
      );
    }
  };

  const getCellValue = (row: any, variants: string[]) => {
    for (const v of variants) {
      if (row[v] !== undefined && row[v] !== null) return String(row[v]);
      const lowerKey = Object.keys(row).find(k => k && k.toLowerCase().replace(/\s+/g, "") === v.toLowerCase().replace(/\s+/g, ""));
      if (lowerKey) return String(row[lowerKey]);
    }
    return "";
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const mapped: Student[] = rawJson.map((row: any, idx: number) => {
        const admissionNo = getCellValue(row, ["admissionNo", "AdmissionNo", "Admission No", "studentAdmissionNo", "student_admission_no"]);
        const name = getCellValue(row, ["name", "Name", "studentName", "student_name"]);
        const gradeVal = getCellValue(row, ["grade", "Grade", "studentGrade", "student_grade"]);
        const classVal = getCellValue(row, ["class", "Class", "studentClass", "student_class"]);
        const medium = getCellValue(row, ["medium", "Medium"]);
        const yearVal = getCellValue(row, ["year", "Year"]);

        return {
          id: String(row.id ?? row.ID ?? admissionNo ?? `uploaded-${idx}`),
          admissionNo: admissionNo || "",
          name: name || "",
          grade: gradeVal || "",
          class: classVal || "",
          medium: medium || "",
          year: yearVal || ""
        } as Student;
      });

      const cleaned = mapped.filter(m => (m.admissionNo || m.name));

      if (cleaned.length === 0) {
        showSnackbar("No valid student rows found in the uploaded Excel.", "error");
        return;
      }

      setUploadedStudents(cleaned);
      setExcelUploaded(true);
      showSnackbar(`Loaded ${cleaned.length} students from Excel.`, "success");
    } catch (e) {
      console.error(e);
      showSnackbar("Failed to parse Excel file. Make sure it's a valid .xlsx or .xls file.", "error");
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showSnackbar("Unsupported file format. Upload .xlsx, .xls or .csv", "error");
      return;
    }
    void parseExcelFile(file);
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const downloadSampleExcel = () => {
    try {
      const sample = [
        {
          "Admission No": "A001",
          "Name": "Sunita Suren",
          "Grade": "Grade 1",
          "Class": "A",
          "Medium": "English",
          "Year": "2024"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sample, { header: ["Admission No", "Name", "Grade", "Class", "Medium", "Year"] });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, "student_promotion_sample.xlsx");
    } catch (err) {
      console.error("Failed to generate sample Excel", err);
      showSnackbar("Failed to generate sample file", "error");
    }
  };

  const clearUploadedData = () => {
    setExcelUploaded(false);
    setUploadedStudents([]);
  };

  const clearFilters = () => {
    setYear("");
    setGrade("");
    setClassFilter("");
    setStudents([]);
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      <CssBaseline />
      <Sidebar
        open={sidebarOpen || hovered}
        setOpen={setSidebarOpen}
      />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: 'hidden' }}>
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
            title="Student Promotion"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Box sx={{ 
          p: { xs: 2, sm: 3 }, 
          flex: 1, 
          overflow: 'auto',
          pb: { xs: 3, sm: 3 }
        }}>
          {/* Header with button */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            mb: { xs: 2, sm: 3 }
          }}>
            <Button
              variant="contained"
              startIcon={!isMobile && <Add />}
              onClick={handleOpenDialog}
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? '100%' : 200 }}
            >
              {isMobile ? "Add Students" : "Add Students to Next Year"}
            </Button>
          </Box>

          {/* Filter Section */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
              Filter Students
            </Typography>
            <Stack 
              direction={{ xs: "column", sm: "row" }} 
              spacing={2}
            >
              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: { xs: "45px", sm: "50px" },
                  },
                }}
              >
                <InputLabel>Year</InputLabel>
                <Select
                  value={year}
                  label="Year"
                  onChange={(e) => setYear(e.target.value)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: { xs: "45px", sm: "50px" },
                  },
                }}
              >
                <InputLabel>Grade</InputLabel>
                <Select
                  value={grade}
                  label="Grade"
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {grades.map((g) => {
                    const gv = gradeToValue(g);
                    return (
                      <MenuItem key={gv || `grade-${grades.indexOf(g)}`} value={gv}>
                        {gv}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: { xs: "45px", sm: "50px" },
                  },
                }}
              >
                <InputLabel>Class</InputLabel>
                <Select
                  value={classFilter}
                  label="Class"
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: { xs: "45px", sm: "50px" },
                  },
                }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={clearFilters}
                  sx={{
                    borderRadius: "10px",
                    height: { xs: "45px", sm: "50px" },
                    width: "100%",
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                      backgroundColor: "rgba(25, 118, 210, 0.08)",
                    },
                  }}
                >
                  Clear Filters
                </Button>
              </FormControl>
            </Stack>
          </Paper>

          {/* Students Table */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
              Students List
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ 
                maxHeight: { xs: 'calc(100vh - 420px)', sm: 'none' },
                overflowX: 'auto'
              }}>
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {isMobile ? "Adm. No" : "Admission No"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Class</TableCell>
                      {!isMobile && <TableCell sx={{ fontWeight: 'bold' }}>Medium</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.admissionNo}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.name}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.grade}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.class}</TableCell>
                        {!isMobile && <TableCell>{student.medium}</TableCell>}
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isMobile ? 4 : 5} align="center">
                          No students found. Please select filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Promotion Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant={isMobile ? "subtitle1" : "h6"}>
              {isMobile ? "Promote Students" : "Promote Students to Next Year"}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
          {/* Current Year Details */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} mb={1} gap={{ xs: 2, sm: 0 }}>
              <Typography variant={isMobile ? "subtitle2" : "h6"} gutterBottom>
                Current Year Details
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch" width={{ xs: "100%", sm: "auto" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={onFileInputChange}
                />
                <Button variant="outlined" onClick={triggerFileSelect} fullWidth={isMobile} size={isMobile ? "small" : "medium"}>
                  Upload Excel
                </Button>

                <Button variant="outlined" onClick={downloadSampleExcel} fullWidth={isMobile} size={isMobile ? "small" : "medium"}>
                  {isMobile ? "Sample" : "Download Sample"}
                </Button>

                {excelUploaded && (
                  <Button color="error" variant="text" onClick={clearUploadedData} fullWidth={isMobile} size={isMobile ? "small" : "medium"}>
                    Clear Upload
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Filters */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Year</InputLabel>
                <Select
                  value={currentYearFilter}
                  label="Year"
                  onChange={(e) => setCurrentYearFilter(e.target.value)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Grade</InputLabel>
                <Select
                  value={currentGradeFilter}
                  label="Grade"
                  onChange={(e) => setCurrentGradeFilter(e.target.value)}
                >
                  {grades.map((g, index) => {
                    const gradeValue = typeof g === 'object' ? g.grade : g;
                    return (
                      <MenuItem
                        key={typeof g === 'object' ? g.id : `grade-${index}-${gradeValue}`}
                        value={gradeValue}
                      >
                        {gradeValue}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" disabled={!currentGradeFilter}>
                <InputLabel>Class</InputLabel>
                <Select
                  value={currentClassFilter}
                  label="Class"
                  onChange={(e) => setCurrentClassFilter(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Search Students"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Stack>

            {/* Students Table */}
            <TableContainer sx={{ maxHeight: { xs: 200, sm: 300 } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={!isAllSelected && dialogDisplayStudents.length > 0 && dialogDisplayStudents.some(s => selectedStudents.some(sel => sel.id === s.id))}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        inputProps={{ 'aria-label': 'select all students' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Name</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{isMobile ? "Adm." : "Admission No"}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleSelectAllAction}
                        sx={{ minWidth: { xs: 70, sm: 85 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        {isAllSelected ? "Unselect" : "Select"}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogDisplayStudents.map((student) => {
                    const alreadySelected = selectedStudents.some(s => s.id === student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={alreadySelected}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectStudent(student);
                              else handleRemoveStudent(student.id);
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.name}</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.admissionNo}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSelectStudent(student)}
                            disabled={alreadySelected}
                            sx={{ minWidth: { xs: 70, sm: 85 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                          >
                            {alreadySelected ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dialogDisplayStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Next Year Details */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} gutterBottom>
              Next Year Details
            </Typography>

            {/* Next Year Filters */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Next Year</InputLabel>
                <Select
                  value={nextYear}
                  label="Next Year"
                  onChange={(e) => setNextYear(e.target.value)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Next Grade</InputLabel>
                <Select
                  value={nextGrade}
                  label="Next Grade"
                  onChange={(e) => setNextGrade(e.target.value)}
                >
                  {grades.map((g, index) => {
                    const gradeValue = typeof g === 'object' ? g.grade : g;
                    return (
                      <MenuItem
                        key={typeof g === 'object' ? g.id : `next-grade-${index}-${gradeValue}`}
                        value={gradeValue}
                      >
                        {gradeValue}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" disabled={!nextGrade}>
                <InputLabel>Next Class</InputLabel>
                <Select
                  value={nextClass}
                  label="Next Class"
                  onChange={(e) => setNextClass(e.target.value)}
                >
                  {nextGrade ? classes.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  )) : []}
                </Select>
              </FormControl>
            </Stack>

            {/* Selected Students Table */}
            <Typography variant="subtitle2" gutterBottom>
              Selected Students ({selectedStudents.length})
            </Typography>
            <TableContainer sx={{ maxHeight: { xs: 200, sm: 300 } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Name</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{isMobile ? "Adm." : "Admission No"}</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.name}</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.admissionNo}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No students selected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'flex-end', 
            gap: 2 
          }}>
            <Button 
              onClick={handleCloseDialog}
              fullWidth={isMobile}
              variant={isMobile ? "outlined" : "text"}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePromoteStudents}
              disabled={selectedStudents.length === 0 || !nextYear || !nextGrade || !nextClass}
              fullWidth={isMobile}
            >
              Save Promotion
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddStudent;