import { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  CssBaseline,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Stack,
  useMediaQuery,
  Card,
  CardContent,
  Chip
} from "@mui/material";
import { Search, Close, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { fetchTeachersByGradeAndClass, assignClassTeacher, deleteClassTeacher, getAllClassTeachers, fetchGrades, fetchGradeClasses, type Teacher, type GradeClass } from "../api/teacherApi";

interface ClassTeacherData {
  grade: string;
  classes: {
    className: string;
    teacherId: string;
    teacherName: string;
    staffNo: string;
    isEditing: boolean;
    assignmentId?: number | string;
  }[];
}

interface PopupFormData {
  searchTerm: string;
  selectedGrade: string;
  selectedClass: string;
  teachers: Teacher[];
}

const AddClassTeacher = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [popupOpen, setPopupOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<{grade: string; className: string; teacherId: string} | null>(null);
  const [isNewAssignment, setIsNewAssignment] = useState(false);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [popupFormData, setPopupFormData] = useState<PopupFormData>({
    searchTerm: "",
    selectedGrade: "",
    selectedClass: "",
    teachers: []
  });
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<GradeClass[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  useCustomTheme();

  const refreshClassTeachers = async () => {
    try {
      setLoading(true);
      const assignments = await getAllClassTeachers();
      const grouped = assignments.reduce<Record<string, ClassTeacherData["classes"]>>((acc, item) => {
        const grade = item.grade || "Unknown";
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push({
          className: item.className,
          teacherId: item.teacherId || "",
          teacherName: item.teacherName || "Not assigned",
          staffNo: item.staffNo || "",
          isEditing: false,
          assignmentId: item.id
        });
        return acc;
      }, {});

      const initialData: ClassTeacherData[] = Object.keys(grouped).map(grade => ({
        grade,
        classes: grouped[grade]
      }));

      setClassTeachers(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshClassTeachers();
  }, []);

  const handleOpenPopup = async (grade: string, className: string, teacherId: string) => {
    setIsNewAssignment(false);
    setCurrentClass({ grade, className, teacherId });
    setPopupError(null);
    setPopupFormData({
      searchTerm: "",
      selectedGrade: grade, 
      selectedClass: className,
      teachers: []
    });
    setSelectedTeacher(null);
    setPopupOpen(true);

    try {
      setPopupLoading(true);
      const searchedTeachers = await fetchTeachersByGradeAndClass(grade, className);
      setPopupFormData(prev => ({
        ...prev,
        teachers: searchedTeachers
      }));
    } catch (err) {
      setPopupError(err instanceof Error ? err.message : "Failed to search teachers");
    } finally {
      setPopupLoading(false);
    }
  };

  const handleOpenNew = async () => {
    setIsNewAssignment(true);
    setCurrentClass(null);
    setPopupError(null);
    setPopupFormData({
      searchTerm: "",
      selectedGrade: "",
      selectedClass: "",
      teachers: []
    });
    setSelectedTeacher(null);
    setPopupOpen(true);
    await loadGradesAndClasses();
  };

  const loadGradesAndClasses = async () => {
    try {
      setPopupLoading(true);
      const [grades, classes] = await Promise.all([
        fetchGrades(),
        fetchGradeClasses()
      ]);
      setAllGrades(grades);
      setAllClasses(classes);
    } catch (err) {
      setPopupError(err instanceof Error ? err.message : "Failed to load grades and classes");
    } finally {
      setPopupLoading(false);
    }
  };

  const getAvailableClasses = (grade: string) => {
    const allUniqueClasses = Array.from(new Set(allClasses.map(c => c.className).filter(Boolean)));
    if (!grade) return allUniqueClasses.sort();
    const filtered = allClasses
      .filter(c => c.grade && String(c.grade).toLowerCase() === String(grade).toLowerCase())
      .map(c => c.className)
      .filter(Boolean);
    const result = filtered.length ? Array.from(new Set(filtered)) : allUniqueClasses;
    return result.sort();
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setCurrentClass(null);
    setIsNewAssignment(false);
    setPopupFormData({
      searchTerm: "",
      selectedGrade: "",
      selectedClass: "",
      teachers: []
    });
    setSelectedTeacher(null);
    setPopupError(null);
  };

  const handleSearch = async () => {
    try {
      setPopupLoading(true);
      let searchedTeachers: Teacher[] = [];
      
      if (popupFormData.selectedGrade && popupFormData.selectedClass) {
        searchedTeachers = await fetchTeachersByGradeAndClass(
          popupFormData.selectedGrade, 
          popupFormData.selectedClass
        );
      } else if (popupFormData.selectedGrade) {
        searchedTeachers = await fetchTeachersByGradeAndClass(
          popupFormData.selectedGrade,
          ""
        );
      } else if (popupFormData.searchTerm) {
        searchedTeachers = await fetchTeachersByGradeAndClass("", "");
      } else {
        searchedTeachers = [];
      }

      setPopupFormData(prev => ({
        ...prev,
        teachers: searchedTeachers
      }));
    } catch (err) {
      setPopupError(err instanceof Error ? err.message : "Failed to search teachers");
    } finally {
      setPopupLoading(false);
    }
  };

  const onGradeChange = (newGrade: string) => {
    setPopupFormData(prev => ({
      ...prev,
      selectedGrade: newGrade,
      selectedClass: "",
      teachers: []
    }));
  };

  const onClassChange = async (newClass: string) => {
    const currentGrade = popupFormData.selectedGrade;
    setPopupFormData(prev => ({
      ...prev,
      selectedClass: newClass,
      teachers: []
    }));

    if (currentGrade && newClass) {
      try {
        setPopupLoading(true);
        const teachers = await fetchTeachersByGradeAndClass(currentGrade, newClass);
        setPopupFormData(prev => ({ ...prev, teachers }));
      } catch (err) {
        setPopupError(err instanceof Error ? err.message : "Failed to fetch teachers");
      } finally {
        setPopupLoading(false);
      }
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedTeacher) {
      setPopupError("Please select a teacher");
      return;
    }

    const gradeToAssign = currentClass?.grade ?? popupFormData.selectedGrade;
    const classToAssign = currentClass?.className ?? popupFormData.selectedClass;

    if (!gradeToAssign || !classToAssign) {
      setPopupError("Please select both Grade and Class to assign the teacher.");
      return;
    }

    try {
      setPopupLoading(true);
      
      const assignment = {
        grade: gradeToAssign,
        class: classToAssign,
        teacherId: selectedTeacher.id,
        staffNo: selectedTeacher.staffNo,
        teacherName: selectedTeacher.name,
        teacherGrade: selectedTeacher.grade || gradeToAssign,
        teacherClass: selectedTeacher.class || classToAssign,
        name: selectedTeacher.name
      };

      const result = await assignClassTeacher(assignment);
      
      if (result.success) {
        await refreshClassTeachers();
        setSuccess(result.message);
        handleClosePopup();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setPopupError(err instanceof Error ? err.message : "Failed to save assignment");
    } finally {
      setPopupLoading(false);
    }
  };

  const handleSave = async (grade: string, className: string) => {
    const gradeData = classTeachers.find(g => g.grade === grade);
    const classData = gradeData?.classes.find(c => c.className === className);
    
    if (!classData || !classData.teacherId) {
      setError("Please assign a teacher before saving");
      return;
    }

    setClassTeachers(prev => prev.map(g => {
      if (g.grade === grade) {
        return {
          ...g,
          classes: g.classes.map(c => {
            if (c.className === className) {
              return { ...c, isEditing: false };
            }
            return c;
          })
        };
      }
      return g;
    }));

    await refreshClassTeachers();
    setSuccess(`Teacher assigned to ${className} successfully`);
  };

  const handleEdit = (grade: string, className: string) => {
    const gradeData = classTeachers.find(g => g.grade === grade);
    const classData = gradeData?.classes.find(c => c.className === className);
    
    if (classData) {
      void handleOpenPopup(grade, className, classData.teacherId);
    }
  };

  const handleDelete = async (grade: string, className: string, assignmentId?: number | string) => {
    if (!assignmentId) {
      setError("No assignment ID available to delete.");
      return;
    }

    const confirmed = window.confirm(`Delete class teacher assignment for ${grade} / ${className}?`);
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      const result = await deleteClassTeacher(assignmentId);
      if (result.success) {
        await refreshClassTeachers();
        setSuccess(result.message);
      } else {
        setError(result.message || "Failed to delete assignment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", width: "100vw", height: "100vh", bgcolor: theme.palette.background.default }}>
        <CssBaseline />
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      <CssBaseline />
      <Sidebar
        open={sidebarOpen || hovered}
        setOpen={setSidebarOpen}
      />
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
            title="Class Teachers Management"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'stretch', sm: 'center' }} 
            spacing={2} 
            sx={{ mb: 2 }}
          >
            <Typography variant={isMobile ? "h6" : "h5"}>Class Teacher Assignments</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenNew}
              fullWidth={isMobile}
            >
              Add new teacher
            </Button>
          </Stack>

          {/* Mobile Card View */}
          {isMobile ? (
            <Stack spacing={2}>
              {classTeachers.map((gradeData, gradeIndex) =>
                gradeData.classes.map((classData, classIndex) => (
                  <Card key={`${gradeIndex}-${classIndex}`} elevation={2}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip label={gradeData.grade} color="primary" size="small" />
                          <Typography variant="body2" fontWeight="bold">
                            {classData.className}
                          </Typography>
                        </Stack>
                        
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Class Teacher
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {classData.teacherName}
                          </Typography>
                          {classData.staffNo && (
                            <Typography variant="caption" color="text.secondary">
                              Staff No: {classData.staffNo}
                            </Typography>
                          )}
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEdit(gradeData.grade, classData.className)}
                            fullWidth
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => void handleSave(gradeData.grade, classData.className)}
                            disabled={!classData.teacherId}
                            fullWidth
                          >
                            Save
                          </Button>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => void handleDelete(gradeData.grade, classData.className, classData.assignmentId)}
                            disabled={!classData.assignmentId || deleteLoading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          ) : (
            /* Desktop Table View */
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Class Teacher | Staff No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classTeachers.map((gradeData, gradeIndex) =>
                    gradeData.classes.map((classData, classIndex) => (
                      <TableRow key={`${gradeIndex}-${classIndex}`}>
                        <TableCell>
                          {classIndex === 0 && (
                            <Typography variant="subtitle1" fontWeight="bold">
                              {gradeData.grade}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{classData.className}</TableCell>
                        <TableCell>
                          <Typography>
                            {classData.teacherName}
                            {classData.staffNo && ` (${classData.staffNo})`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleEdit(gradeData.grade, classData.className)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => void handleSave(gradeData.grade, classData.className)}
                              disabled={!classData.teacherId}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => void handleDelete(gradeData.grade, classData.className, classData.assignmentId)}
                              disabled={!classData.assignmentId || deleteLoading}
                            >
                              {deleteLoading ? <CircularProgress size={18} /> : "Delete"}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Popup Dialog */}
        <Dialog 
          open={popupOpen} 
          onClose={handleClosePopup}
          maxWidth="lg"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant={isMobile ? "subtitle1" : "h6"}>
                {isNewAssignment ? "Assign Class Teacher - New" : `Assign - ${currentClass?.grade} - ${currentClass?.className}`}
              </Typography>
              <IconButton onClick={handleClosePopup}>
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          
          <DialogContent>
            {popupError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPopupError(null)}>
                {popupError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                placeholder="Search teachers by name or staff no..."
                value={popupFormData.searchTerm}
                onChange={(e) => setPopupFormData(prev => ({
                  ...prev,
                  searchTerm: e.target.value
                }))}
                size="small"
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={popupFormData.selectedGrade}
                    label="Grade"
                    onChange={(e) => onGradeChange(e.target.value as string)}
                  >
                    <MenuItem value="">All Grades</MenuItem>
                    {allGrades.map((grade) => (
                      <MenuItem key={`grade-${grade}`} value={grade}>
                        {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={popupFormData.selectedClass}
                    label="Class"
                    onChange={(e) => onClassChange(e.target.value as string)}
                    disabled={!popupFormData.selectedGrade}
                  >
                    <MenuItem value="">Select Class</MenuItem>
                    {getAvailableClasses(popupFormData.selectedGrade).map((cls) => (
                      <MenuItem key={`class-${cls}`} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button 
                  variant="contained" 
                  onClick={handleSearch}
                  startIcon={<Search />}
                  disabled={popupLoading}
                  fullWidth={isMobile}
                  sx={{ minWidth: { sm: 120 } }}
                >
                  Search
                </Button>
              </Stack>
            </Stack>

            {/* Teachers List - Mobile Cards, Desktop Table */}
            {isMobile ? (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {popupFormData.teachers.map((teacher, tIdx) => (
                  <Card 
                    key={teacher.id || `teacher-${tIdx}`}
                    onClick={() => setSelectedTeacher(teacher)}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedTeacher?.id === teacher.id ? theme.palette.action.selected : 'inherit',
                      border: selectedTeacher?.id === teacher.id ? `2px solid ${theme.palette.primary.main}` : 'none'
                    }}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight="bold">{teacher.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Staff No: {teacher.staffNo || 'Not assigned'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={teacher.grade || 'No grade'} size="small" variant="outlined" />
                        <Chip label={teacher.class || 'No class'} size="small" variant="outlined" />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {popupFormData.teachers.length === 0 && !popupLoading && (
                  <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                    No teachers found. Try searching with different criteria.
                  </Typography>
                )}
              </Stack>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Staff No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Class</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popupFormData.teachers.map((teacher, tIdx) => (
                      <TableRow 
                        key={teacher.id || `teacher-${tIdx}`}
                        onClick={() => setSelectedTeacher(teacher)}
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: selectedTeacher?.id === teacher.id ? theme.palette.action.selected : 'inherit',
                          '&:hover': { backgroundColor: theme.palette.action.hover }
                        }}
                      >
                        <TableCell>{teacher.staffNo || 'Not assigned'}</TableCell>
                        <TableCell>{teacher.name}</TableCell>
                        <TableCell>{teacher.grade || 'Not assigned'}</TableCell>
                        <TableCell>{teacher.class || 'Not assigned'}</TableCell>
                      </TableRow>
                    ))}
                    {popupFormData.teachers.length === 0 && !popupLoading && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="textSecondary">
                            No teachers found. Try searching with different criteria.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {popupLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {selectedTeacher && (
              <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.success.light, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Selected Teacher:
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedTeacher.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Staff No:</strong> {selectedTeacher.staffNo}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Current Grade:</strong> {selectedTeacher.grade || 'Not assigned'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Current Class:</strong> {selectedTeacher.class || 'Not assigned'}
                  </Typography>
                </Stack>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
              <Button onClick={handleClosePopup} disabled={popupLoading} fullWidth={isMobile}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAssignment} 
                variant="contained"
                disabled={popupLoading || !selectedTeacher || !(popupFormData.selectedGrade || currentClass?.grade) || !(popupFormData.selectedClass || currentClass?.className)}
                fullWidth={isMobile}
              >
                {popupLoading ? <CircularProgress size={24} /> : "Assign Teacher"}
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AddClassTeacher;