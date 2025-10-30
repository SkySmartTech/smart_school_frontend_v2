// src/components/UserProfile.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  AppBar,
  Typography,
  Button,
  TextField,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CssBaseline,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  Avatar,
  Paper,
  Skeleton,
  Stack,
  useMediaQuery,
  IconButton,
  Collapse,
} from "@mui/material";
import { 
  Edit as EditIcon, 
  PhotoCamera, 
  Refresh,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadUserPhoto,
  checkAuthStatus,
  updateUserProfileDetails,
} from "../api/userProfileApi";
import type { User, TeacherData, ParentData, StudentData, TeacherInfo } from "../types/userTypes";

// Custom Dialog component with proper focus management
const Dialog: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  [key: string]: any;
}> = ({ children, onClose, open, ...props }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      setTimeout(() => {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }, 50);
    }
  }, [open]);

  return (
    <MuiDialog ref={dialogRef} open={open} onClose={onClose} {...props}>
      {children}
    </MuiDialog>
  );
};

const defaultUser: User = {
  id: 0,
  name: "",
  address: "",
  password: "********",
  birthDay: "",
  email: "",
  userType: "",
  gender: "",
  userRole: "",
  username: "",
  location: "",
  grade: "",
  contact: "",
  photo: "",
  subject: "",
  class: "",
  teacher_data: null,
  parent_data: null,
  student_data: null,
};

const UserProfile: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPhoto, setOpenPhoto] = useState(false);
  const [openOther, setOpenOther] = useState(false);
  const [editUser, setEditUser] = useState<User>(defaultUser);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof User, string>>
  >({});

  // Expandable sections state for mobile
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: false,
    additional: false,
  });

  const [editingTeacher, setEditingTeacher] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(false);

  const [localTeacherData, setLocalTeacherData] = useState<TeacherData | null>(null);
  const [localParentData, setLocalParentData] = useState<ParentData[]>([]);
  const [localStudentData, setLocalStudentData] = useState<StudentData | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  useCustomTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!checkAuthStatus()) {
      showSnackbar("Please login to view your profile", "warning");
    }
  }, []);

  const { data: user, isLoading: isDataLoading, isError, error, refetch } = useQuery<User>({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    retry: (failureCount, error) => {
      if (error.message.includes("login") || error.message.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (user) {
      setEditUser(user);
      const errors = Object.keys(defaultUser).reduce((acc, key) => {
        acc[key as keyof User] = "";
        return acc;
      }, {} as Partial<Record<keyof User, string>>);
      setValidationErrors(errors);
    }
  }, [user]);

  useEffect(() => {
    if (openOther && user) {
      setLocalTeacherData(user.teacher_data ? JSON.parse(JSON.stringify(user.teacher_data)) : null);
      setLocalParentData(
        user.parent_data 
          ? Array.isArray(user.parent_data) 
            ? JSON.parse(JSON.stringify(user.parent_data))
            : [JSON.parse(JSON.stringify(user.parent_data))]
          : []
      );
      setLocalStudentData(user.student_data ? JSON.parse(JSON.stringify(user.student_data)) : null);

      setEditingTeacher(false);
      setEditingParent(false);
      setEditingStudent(false);
    }
  }, [openOther, user]);

  useEffect(() => {
    if (isError && error) {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message, isAuthError ? "warning" : "error");
    }
  }, [isError, error]);

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, user }: { id: number; user: Partial<User> }) => updateUserProfile(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setOpenEdit(false);
      showSnackbar("Profile updated successfully!", "success");
    },
    onError: (error: any) => {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message || "Failed to update profile", isAuthError ? "warning" : "error");
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => uploadUserPhoto(file),
    onSuccess: (photoUrl) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditUser((prev) => ({ ...prev, photo: photoUrl }));
      setOpenPhoto(false);
      showSnackbar("Photo uploaded successfully!", "success");
    },
    onError: (error: any) => {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message || "Failed to upload photo", isAuthError ? "warning" : "error");
    },
  });

  const otherProfileMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, any> }) =>
      updateUserProfileDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      showSnackbar("Profile details updated successfully!!", "success");
      setEditingTeacher(false);
      setEditingParent(false);
      setEditingStudent(false);
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to update profile details";
      const isAuth = msg.includes("login") || msg.includes("Session expired");
      showSnackbar(msg, isAuth ? "warning" : "error");
    },
  });

  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const validateField = (name: keyof User, value: string) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.trim().length < 2) error = "Name must be at least 2 characters";
        break;
      case "username":
        if (!value.trim()) error = "Username is required";
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) error = "Username can only contain letters, numbers, and underscores";
        else if (value.length < 3) error = "Username must be at least 3 characters";
        break;
      case "email":
        if (!value.trim()) error = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(value)) error = "Please enter a valid email address";
        break;
      case "contact":
        if (!value.trim()) error = "Contact is required";
        else if (!/^\+?[0-9]{10,15}$/.test(value.replace(/\s|-/g, ""))) error = "Please enter a valid phone number (10-15 digits)";
        break;
      case "address":
        if (!value.trim()) error = "Address is required";
        else if (value.trim().length < 2) error = "Address must be at least 2 characters";
        break;
      case "birthDay":
        if (!value.trim()) error = "Birthday is required";
        else {
          const birthDate = new Date(value);
          const today = new Date();
          if (birthDate >= today) error = "Birthday must be in the past";
        }
        break;
    }
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
    validateField(name as keyof User, value);
  };

  const validateAllFields = () => {
    const requiredFields = ["name", "username", "email", "contact", "grade", "address", "birthDay", "location"];
    return requiredFields.every((field) => validateField(field as keyof User, editUser[field as keyof User] as string));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        showSnackbar("Please upload an image file (JPEG, PNG, GIF, or WebP)", "error");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showSnackbar("File is too large. Please upload an image smaller than 5MB", "error");
        return;
      }

      await uploadPhotoMutation.mutateAsync(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!validateAllFields()) {
      showSnackbar("Please fix all validation errors before saving", "error");
      return;
    }

    if (!checkAuthStatus()) {
      showSnackbar("Please login to update your profile", "warning");
      return;
    }

    try {
      const { photo, ...userData } = editUser;
      await updateProfileMutation.mutateAsync({ id: editUser.id, user: userData });
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleRefresh = () => {
    if (checkAuthStatus()) {
      refetch();
      showSnackbar("Refreshing profile data...", "info");
    } else {
      showSnackbar("Please login to refresh data", "warning");
    }
  };

  const isMutating = updateProfileMutation.isPending || uploadPhotoMutation.isPending || otherProfileMutation.isPending;

  const LoadingSkeleton = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
      {[...Array(isMobile ? 6 : 13)].map((_, i) => (
        <Skeleton key={i} variant="text" height={24} />
      ))}
    </Box>
  );

  const getTeacherInfoArray = (teacherData: TeacherData | null | undefined): TeacherInfo[] => {
    if (!teacherData) return [];
    
    if (Array.isArray(teacherData)) {
      return teacherData as any;
    } else if (teacherData.teacher_info && Array.isArray(teacherData.teacher_info)) {
      return teacherData.teacher_info;
    } else if (teacherData.id) {
      return [teacherData as any];
    }
    
    return [];
  };

  const handleTeacherFieldChange = (index: number, field: keyof TeacherInfo, value: any) => {
    setLocalTeacherData((prev) => {
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as TeacherData) : ({ teacher_info: [] } as TeacherData);
      const teacherInfoArray = getTeacherInfoArray(copy);

      if (!teacherInfoArray[index]) {
        teacherInfoArray[index] = {} as TeacherInfo;
      }

      (teacherInfoArray[index] as any)[field] = value;
      copy.teacher_info = teacherInfoArray;
      return copy;
    });
  };

  const addTeacherRow = () => {
    setLocalTeacherData((prev) => {
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as TeacherData) : ({ teacher_info: [] } as TeacherData);
      const teacherInfoArray = getTeacherInfoArray(copy);
      teacherInfoArray.push({} as TeacherInfo);
      copy.teacher_info = teacherInfoArray;
      return copy;
    });
  };

  const removeTeacherRow = (index: number) => {
    setLocalTeacherData((prev) => {
      if (!prev) return prev;
      const copy = (JSON.parse(JSON.stringify(prev)) as TeacherData);
      const teacherInfoArray = getTeacherInfoArray(copy);
      if (teacherInfoArray.length > index) {
        teacherInfoArray.splice(index, 1);
        copy.teacher_info = teacherInfoArray;
      }
      return copy;
    });
  };

  const handleParentFieldChange = (fieldPath: string, value: any) => {
    setLocalParentData((prev) => {
      const copy = prev ? JSON.parse(JSON.stringify(prev)) : [];
      
      const [parentIndex, ...path] = fieldPath.split('.');
      const pIndex = parseInt(parentIndex, 10);
      
      if (!copy[pIndex]) {
        copy[pIndex] = { parent_info: {}, students_info: [] };
      }
      
      let target = copy[pIndex];
      let current = target;
      
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (key === 'students_info') {
          const studentIndex = parseInt(path[i + 1], 10);
          if (!current.students_info[studentIndex]) {
            current.students_info[studentIndex] = {
              name: null,
              studentAdmissionNo: '',
              grade: '',
              class: null
            };
          }
          current = current.students_info[studentIndex];
          i++;
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      const lastKey = path[path.length - 1];
      current[lastKey] = value;
      
      return copy;
    });
  };

  const handleStudentFieldChange = (field: keyof StudentData, value: any) => {
    setLocalStudentData((prev) => {
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as StudentData) : ({} as StudentData);
      (copy as any)[field] = value;
      return copy;
    });
  };

  const buildFullPayload = (user: User, changes: Record<string, any>) => {
    const requiredTopLevel = [
      "name",
      "address",
      "email",
      "contact",
      "userType",
      "gender",
      "username",
    ];

    const optionalTopLevel = [
      "birthDay",
      "location",
      "userRole",
      "grade",
      "photo",
      "subject",
      "class",
    ];

    const base: Record<string, any> = {};

    requiredTopLevel.forEach((k) => {
      base[k] = (user as any)[k] ?? "";
    });

    optionalTopLevel.forEach((k) => {
      if ((user as any)[k] !== undefined) base[k] = (user as any)[k];
    });

    const merged = { ...base, ...changes };

    if (merged.access) {
      delete merged.access;
    }

    return merged;
  };

  const handleSaveOther = async () => {
    if (!user) {
      showSnackbar("User data not loaded", "error");
      return;
    }

    const changes: Record<string, any> = {};

    if (editingTeacher && localTeacherData) {
      changes.teacher_data = localTeacherData;
    }
    if (editingParent && localParentData) {
      changes.parent_data = localParentData;
    }
    if (editingStudent && localStudentData) {
      changes.student_data = localStudentData;
    }

    if (Object.keys(changes).length === 0) {
      showSnackbar("No changes to save", "info");
      return;
    }

    const payloadToSend = buildFullPayload(user, changes);

    try {
      await otherProfileMutation.mutateAsync({ id: user.id, payload: payloadToSend });
    } catch (err) {
      console.error("Failed to save other profile data", err);
      showSnackbar("Failed to save profile details", "error");
    }
  };

  const handleCancelOtherEdit = () => {
    setLocalTeacherData(user?.teacher_data ? JSON.parse(JSON.stringify(user.teacher_data)) : null);
    setLocalParentData(user?.parent_data ? JSON.parse(JSON.stringify(user.parent_data)) : []);
    setLocalStudentData(user?.student_data ? JSON.parse(JSON.stringify(user.student_data)) : null);
    setEditingTeacher(false);
    setEditingParent(false);
    setEditingStudent(false);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderTeacherEditable = (teacherData: TeacherData | undefined | null) => {
    const dataToRender = editingTeacher ? localTeacherData : teacherData;
    const teacherInfoArray = getTeacherInfoArray(dataToRender);
    
    if (!teacherInfoArray || teacherInfoArray.length === 0) {
      return (
        <Stack spacing={2}>
          <Typography>No teacher profile data available.</Typography>
          {editingTeacher && (
            <Button variant="outlined" onClick={addTeacherRow} disabled={isMutating} fullWidth={isMobile}>
              Add Teacher Entry
            </Button>
          )}
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        {teacherInfoArray.map((t, idx) => (
          <Paper key={t.id ?? `t-${idx}`} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {editingTeacher ? (
                  <>
                    <TextField
                      label="Subject"
                      value={t.subject || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "subject", e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    />
                    <TextField
                      label="Staff No"
                      value={t.staffNo || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "staffNo", e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {t.subject || "No Subject"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Staff No: {t.staffNo || "-"}
                    </Typography>
                  </>
                )}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {editingTeacher ? (
                  <>
                    <TextField
                      label="Grade"
                      value={t.teacherGrade || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "teacherGrade", e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    />
                    <TextField
                      label="Class"
                      value={t.teacherClass || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "teacherClass", e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    />
                    <TextField
                      label="Medium"
                      value={t.medium || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "medium", e.target.value)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body2"><strong>Grade:</strong> {t.teacherGrade || "-"}</Typography>
                    <Typography variant="body2"><strong>Class:</strong> {t.teacherClass || "-"}</Typography>
                    <Typography variant="body2"><strong>Medium:</strong> {t.medium || "-"}</Typography>
                  </>
                )}
              </Stack>

              {editingTeacher && (
                <Button 
                  color="error" 
                  onClick={() => removeTeacherRow(idx)} 
                  disabled={isMutating}
                  size={isMobile ? "small" : "medium"}
                  fullWidth={isMobile}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
        {editingTeacher && (
          <Button 
            variant="outlined" 
            onClick={addTeacherRow} 
            disabled={isMutating}
            fullWidth={isMobile}
            size={isMobile ? "small" : "medium"}
          >
            Add Teacher Entry
          </Button>
        )}
      </Stack>
    );
  };

  const renderParentEditable = (parentData: ParentData[] | undefined | null) => {
    const data = editingParent 
      ? localParentData 
      : (Array.isArray(parentData) 
          ? parentData 
          : parentData 
            ? [parentData] 
            : []);
    
    if (!data || data.length === 0) {
      return <Typography>No parent profile data available.</Typography>;
    }

    return (
      <Stack spacing={3}>
        {data.map((parentEntry, parentIndex) => (
          <Stack key={parentEntry.parent_info?.id || parentIndex} spacing={2}>
            <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack spacing={2}>
                <Typography variant="h6" fontSize={{ xs: "1rem", sm: "1.25rem" }} gutterBottom>
                  Parent Information #{parentIndex + 1}
                </Typography>
                
                <Stack spacing={2}>
                  {editingParent ? (
                    <>
                      <TextField
                        fullWidth
                        label="Profession"
                        value={parentEntry.parent_info?.profession || ''}
                        onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.profession`, e.target.value)}
                        size={isMobile ? "small" : "medium"}
                      />
                      
                      <TextField
                        fullWidth
                        label="Relation"
                        value={parentEntry.parent_info?.relation || ''}
                        onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.relation`, e.target.value)}
                        size={isMobile ? "small" : "medium"}
                      />
                      
                      <TextField
                        fullWidth
                        label="Contact"
                        value={parentEntry.parent_info?.parent_contact || ''}
                        onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.parent_contact`, e.target.value)}
                        size={isMobile ? "small" : "medium"}
                      />
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2"><strong>Profession:</strong> {parentEntry.parent_info?.profession || '-'}</Typography>
                      <Typography variant="body2"><strong>Relation:</strong> {parentEntry.parent_info?.relation || '-'}</Typography>
                      <Typography variant="body2"><strong>Contact:</strong> {parentEntry.parent_info?.parent_contact || '-'}</Typography>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack spacing={2}>
                <Typography variant="h6" fontSize={{ xs: "1rem", sm: "1.25rem" }} gutterBottom>
                  Associated Students
                </Typography>
                
                {parentEntry.students_info?.map((student, studentIndex) => (
                  <Stack 
                    key={student.studentAdmissionNo || studentIndex} 
                    spacing={2}
                    sx={{ 
                      p: { xs: 1.5, sm: 2 }, 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="subtitle1" fontSize={{ xs: "0.875rem", sm: "1rem" }}>
                      Student #{studentIndex + 1}
                    </Typography>
                    
                    {editingParent ? (
                      <>
                        <TextField
                          fullWidth
                          label="Name"
                          value={student.name || ''}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.name`,
                            e.target.value
                          )}
                          size={isMobile ? "small" : "medium"}
                        />
                        
                        <TextField
                          fullWidth
                          label="Admission No"
                          value={student.studentAdmissionNo || ''}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.studentAdmissionNo`,
                            e.target.value
                          )}
                          size={isMobile ? "small" : "medium"}
                        />
                        
                        <TextField
                          fullWidth
                          label="Grade"
                          value={student.grade || ''}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.grade`,
                            e.target.value
                          )}
                          size={isMobile ? "small" : "medium"}
                        />
                        
                        <TextField
                          fullWidth
                          label="Class"
                          value={student.class || ''}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.class`,
                            e.target.value
                          )}
                          size={isMobile ? "small" : "medium"}
                        />
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2"><strong>Name:</strong> {student.name || '-'}</Typography>
                        <Typography variant="body2"><strong>Admission No:</strong> {student.studentAdmissionNo || '-'}</Typography>
                        <Typography variant="body2"><strong>Grade:</strong> {student.grade || '-'}</Typography>
                        <Typography variant="body2"><strong>Class:</strong> {student.class || '-'}</Typography>
                      </Box>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        ))}
      </Stack>
    );
  };

  const renderStudentEditable = (studentData: StudentData | undefined | null) => {
    const s = editingStudent ? localStudentData : studentData;
    if (!s) {
      return <Typography>No student profile data available.</Typography>;
    }

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={600}>Student Details</Typography>
          {editingStudent ? (
            <Stack spacing={2}>
              <TextField 
                label="Grade" 
                value={s.studentGrade || ""} 
                onChange={(e) => handleStudentFieldChange("studentGrade", e.target.value)} 
                fullWidth 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                label="Class" 
                value={s.studentClass || ""} 
                onChange={(e) => handleStudentFieldChange("studentClass", e.target.value)} 
                fullWidth 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                label="Medium" 
                value={s.medium || ""} 
                onChange={(e) => handleStudentFieldChange("medium", e.target.value)} 
                fullWidth 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                label="Year" 
                value={s.year || ""} 
                onChange={(e) => handleStudentFieldChange("year", e.target.value)} 
                fullWidth 
                size={isMobile ? "small" : "medium"}
              />
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2"><strong>Admission No:</strong> {s.studentAdmissionNo || "-"}</Typography>
              <Typography variant="body2"><strong>Grade:</strong> {s.studentGrade || "-"}</Typography>
              <Typography variant="body2"><strong>Class:</strong> {s.studentClass || "-"}</Typography>
              <Typography variant="body2"><strong>Medium:</strong> {s.medium || "-"}</Typography>
              <Typography variant="body2"><strong>Year:</strong> {s.year || "-"}</Typography>
              <Typography variant="body2"><strong>Updated By:</strong> {s.modifiedBy || "-"}</Typography>
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen || hovered} setOpen={setSidebarOpen} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <AppBar
          position="static"
          sx={{
            bgcolor: theme.palette.background.paper,
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
          }}
        >
          <Navbar title="User Profile" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </AppBar>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          style={{ flex: 1 }}
        >
          <Paper
            elevation={isMobile ? 0 : 3}
            sx={{
              bgcolor: theme.palette.background.paper,
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: { xs: 0, sm: 3 },
              maxWidth: 900,
              mx: "auto",
              mt: { xs: 0, sm: 2, md: 4 },
              mb: { xs: 0, sm: 2, md: 4 },
              minHeight: { xs: '100%', sm: 'auto' },
            }}
          >
            {/* Profile Header - Mobile Responsive */}
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between", 
              alignItems: { xs: "center", sm: "flex-start" },
              gap: { xs: 2, sm: 3 },
              mb: 4 
            }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center", 
                gap: { xs: 2, sm: 3 },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Avatar 
                  src={user?.photo || "/default-avatar.png"} 
                  sx={{ 
                    width: { xs: 80, sm: 100 }, 
                    height: { xs: 80, sm: 100 }, 
                    border: `3px solid ${theme.palette.primary.main}` 
                  }} 
                />
                <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h5" fontSize={{ xs: "1.25rem", sm: "1.5rem" }} fontWeight="bold" gutterBottom>
                    {isDataLoading ? <Skeleton width={200} /> : user?.name || "Unknown User"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontSize={{ xs: "0.875rem", sm: "1rem" }}>
                    {isDataLoading ? <Skeleton width={150} /> : user?.userRole || "No Role"}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<PhotoCamera />} 
                    onClick={() => setOpenPhoto(true)} 
                    disabled={isMutating} 
                    sx={{ mt: 1 }}
                    size={isMobile ? "small" : "medium"}
                    fullWidth={isMobile}
                  >
                    Change Photo
                  </Button>
                </Box>
              </Box>

              <Button 
                variant="outlined" 
                onClick={handleRefresh} 
                disabled={isDataLoading || isMutating} 
                startIcon={<Refresh />}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              >
                Refresh
              </Button>
            </Box>

            {/* Error State */}
            {isError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error?.message || "Failed to load profile data"}
              </Alert>
            )}

            {/* User Information - Collapsible on Mobile */}
            <Box sx={{ mb: 3 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2,
                  cursor: isMobile ? 'pointer' : 'default'
                }}
                onClick={isMobile ? () => toggleSection('personal') : undefined}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                  Personal Information
                </Typography>
                {isMobile && (
                  <IconButton 
                    size="small"
                    sx={{
                      transform: expandedSections.personal ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s'
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                )}
              </Box>

              <Collapse in={!isMobile || expandedSections.personal}>
                {isDataLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <Box sx={{ 
                    display: "grid", 
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, 
                    gap: { xs: 1.5, sm: 2 },
                    fontSize: { xs: "0.875rem", sm: "1rem" }
                  }}>
                    <Typography variant="body2"><strong>Name:</strong> {user?.name || "-"}</Typography>
                    <Typography variant="body2"><strong>Username:</strong> {user?.username || "-"}</Typography>
                    <Typography variant="body2"><strong>Email:</strong> {user?.email || "-"}</Typography>
                    <Typography variant="body2"><strong>Contact:</strong> {user?.contact || "-"}</Typography>
                    <Typography variant="body2" sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                      <strong>Address:</strong> {user?.address || "-"}
                    </Typography>
                    <Typography variant="body2"><strong>Birthday:</strong> {user?.birthDay || "-"}</Typography>
                    <Typography variant="body2"><strong>User Type:</strong> {user?.userType || "-"}</Typography>
                    <Typography variant="body2"><strong>Gender:</strong> {user?.gender || "-"}</Typography>
                    <Typography variant="body2"><strong>User Role:</strong> {user?.userRole || "-"}</Typography>
                    <Typography variant="body2"><strong>Location:</strong> {user?.location || "-"}</Typography>
                    {user?.status !== undefined && (
                      <Typography variant="body2">
                        <strong>Status:</strong> {user.status ? "Active" : "Inactive"}
                      </Typography>
                    )}
                  </Box>
                )}
              </Collapse>
            </Box>

            {/* Action Buttons - Stacked on Mobile */}
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" },
              gap: 2, 
              mt: 4, 
              justifyContent: "flex-end" 
            }}>
              <Button 
                variant="outlined" 
                onClick={() => setOpenOther(true)} 
                disabled={isMutating || isDataLoading || !user} 
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
                size={isMobile ? "medium" : "large"}
              >
                Other Profile Data
              </Button>

              <Button 
                variant="contained" 
                startIcon={<EditIcon />} 
                onClick={() => setOpenEdit(true)} 
                disabled={isMutating || isDataLoading || !user} 
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
                size={isMobile ? "medium" : "large"}
              >
                Edit Profile
              </Button>
            </Box>
          </Paper>
        </motion.div>

        {/* Edit Dialog - Mobile Responsive */}
        <Dialog 
          open={openEdit} 
          onClose={() => setOpenEdit(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
          aria-labelledby="edit-profile-title" 
          sx={{ "& .MuiDialog-paper": { borderRadius: { xs: 0, sm: 2 } } }}
        >
          <DialogTitle id="edit-profile-title" sx={{ pb: 1 }}>
            <Typography variant="h6" fontSize={{ xs: "1.125rem", sm: "1.25rem" }} fontWeight="bold">
              Edit Profile Information
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, 
              gap: 2 
            }}>
              <TextField 
                fullWidth 
                label="Name" 
                name="name" 
                value={editUser.name} 
                onChange={handleEditChange} 
                error={!!validationErrors.name} 
                helperText={validationErrors.name} 
                required 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Username" 
                name="username" 
                value={editUser.username} 
                onChange={handleEditChange} 
                error={!!validationErrors.username} 
                helperText={validationErrors.username} 
                required 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Email" 
                name="email" 
                type="email" 
                value={editUser.email} 
                onChange={handleEditChange} 
                error={!!validationErrors.email} 
                helperText={validationErrors.email} 
                required 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Contact" 
                name="contact" 
                value={editUser.contact} 
                onChange={handleEditChange} 
                error={!!validationErrors.contact} 
                helperText={validationErrors.contact} 
                required 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Address" 
                name="address" 
                multiline 
                rows={2} 
                value={editUser.address} 
                onChange={handleEditChange} 
                error={!!validationErrors.address} 
                helperText={validationErrors.address} 
                required 
                sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Birthday" 
                name="birthDay" 
                type="date" 
                value={editUser.birthDay} 
                onChange={handleEditChange} 
                error={!!validationErrors.birthDay} 
                helperText={validationErrors.birthDay} 
                InputLabelProps={{ shrink: true }} 
                required 
                size={isMobile ? "small" : "medium"}
              />
              <TextField 
                fullWidth 
                label="Location" 
                name="location" 
                value={editUser.location} 
                onChange={handleEditChange} 
                error={!!validationErrors.location} 
                helperText={validationErrors.location} 
                required 
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button 
              onClick={() => setOpenEdit(false)} 
              disabled={isMutating}
              fullWidth={isMobile}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              variant="contained" 
              disabled={isMutating} 
              startIcon={isMutating ? <CircularProgress size={20} color="inherit" /> : null}
              fullWidth={isMobile}
            >
              {isMutating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Photo Dialog - Mobile Responsive */}
        <Dialog 
          open={openPhoto} 
          onClose={() => setOpenPhoto(false)} 
          aria-labelledby="photo-upload-title"
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle id="photo-upload-title">Upload New Photo</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                disabled={isMutating}
                style={{ width: '100%' }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, px: 2 }}>
            <Button onClick={() => setOpenPhoto(false)} fullWidth={isMobile}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Other Profile Data Dialog - Mobile Responsive */}
        <Dialog 
          open={openOther} 
          onClose={() => setOpenOther(false)} 
          maxWidth="md" 
          fullWidth 
          fullScreen={isMobile}
          aria-labelledby="other-profile-title"
        >
          <DialogTitle id="other-profile-title">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontSize={{ xs: "1.125rem", sm: "1.25rem" }}>
                Other Profile Data
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ py: 1 }}>
              {isDataLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="rectangular" height={80} />
                </Stack>
              ) : (
                <>
                  {(user?.userType === "Teacher" || user?.teacher_data) && (
                    <Stack spacing={1}>
                      <Typography variant="h6" fontSize={{ xs: "1rem", sm: "1.25rem" }}>
                        Teacher Profile
                      </Typography>
                      {renderTeacherEditable(user?.teacher_data)}
                    </Stack>
                  )}

                  {(user?.userType === "Parent" || user?.parent_data) && (
                    <Stack spacing={1}>
                      <Typography variant="h6" fontSize={{ xs: "1rem", sm: "1.25rem" }}>
                        Parent Profile
                      </Typography>
                      {renderParentEditable(user?.parent_data ? (Array.isArray(user.parent_data) ? user.parent_data : [user.parent_data]) : null)}
                    </Stack>
                  )}

                  {(user?.userType === "Student" || user?.student_data) && (
                    <Stack spacing={1}>
                      <Typography variant="h6" fontSize={{ xs: "1rem", sm: "1.25rem" }}>
                        Student Profile
                      </Typography>
                      {renderStudentEditable(user?.student_data)}
                    </Stack>
                  )}

                  {!((user?.userType === "Teacher" || user?.teacher_data) ||
                    (user?.userType === "Parent" || user?.parent_data) ||
                    (user?.userType === "Student" || user?.student_data)
                  ) && (
                    <Typography>No additional profile data available for this user.</Typography>
                  )}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: { xs: 1, sm: 0 }, 
            px: 2,
            pb: 2
          }}>
            {!editingTeacher && !editingParent && !editingStudent ? (
              <Button onClick={() => setOpenOther(false)} fullWidth={isMobile}>
                Close
              </Button>
            ) : (
              <>
                <Button onClick={handleCancelOtherEdit} disabled={isMutating} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveOther} 
                  variant="contained" 
                  disabled={isMutating} 
                  startIcon={otherProfileMutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
                  fullWidth={isMobile}
                >
                  {otherProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>

      {/* Snackbar - Positioned for Mobile */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} 
        anchorOrigin={{ 
          vertical: isMobile ? "top" : "bottom", 
          horizontal: isMobile ? "center" : "right" 
        }}
        sx={{ mt: isMobile ? 8 : 0 }}
      >
        <Alert 
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;
     