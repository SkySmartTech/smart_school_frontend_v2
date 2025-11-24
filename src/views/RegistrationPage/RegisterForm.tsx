import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar
} from "@mui/material";
import {
  AccountCircle,
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  Email,
  Phone,
  Work,
  Home,
  Cake,
  AssignmentInd,
  School,
  Class,
  Subject,
  Add,
  Delete,
  Language
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { registerUser, registerStudent, registerTeacher, registerParent, fetchGrades, fetchClasses } from "../../api/userApi";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Subject {
  id: number;
  subjectId: number | null;
  grade: string;
  mainSubject: string;
  subSubject: string;
  description: string | null;
  medium: string;
  created_at: string;
  updated_at: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const RegisterForm = ({ onSuccess = () => { }, onError = () => { } }: RegisterFormProps) => {
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/subjects`);
      return response.data;
    }
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: fetchGrades
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses
  });

  const uniqueMainSubjects = useMemo(() => {
    const mainSubjects = subjects.map((subject: any) => subject.mainSubject);
    return [...new Set(mainSubjects)];
  }, [subjects]);

  const gender = ["Male", "Female"];
  const roles = ["Teacher", "Student", "Parent"];
  const mediumOptions = ["Sinhala", "English", "Tamil"];

  const steps: string[] = ['Basic Information', 'Role Details'];

  interface FormData {
    name: string;
    email: string;
    address: string;
    birthDay: string;
    contact: string;
    userType: string;
    username: string;
    password: string;
    location?: string | null;
    userRole: string;
    gender: string;
    photo: FileList | null;
    password_confirmation: string;
    grade?: string;
    studentGrade?: string;
    studentClass?: string;
    subject?: string;
    class?: string;
    profession?: string;
    parentContact?: string;
    parentProfession?: string;
    staffId?: string;
    teacherStaffId?: string;
    studentAdmissionNo?: string;
    teacherGrades: string[];
    teacherClass: string[];
    subjects: string[];
    staffNo?: string;
    medium?: string | string[];
    relation?: string;
  }

  type ParentEntry = {
    id: string;
    studentAdmissionNo: string;
    profession: string;
    relation: string;
    parentContact: string;
    status?: boolean;
  };

  type RegisterFormValues = FormData;

  type TeacherAssignment = {
    grades: string[];
    subjects: string[];
    classes: string[];
    medium: string[];
    id: string;
  };

  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [registeredUser, setRegisteredUser] = useState<{ userId: number; userType: string } | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [parentEntries, setParentEntries] = useState<ParentEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger,
    setError,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      teacherGrades: [],
      teacherClass: [],
      subjects: [],
      medium: [],
      location: "",
      userRole: "user",
    }
  });

  const password = watch("password");
  const userType = watch("userType");

  useEffect(() => {
    setSelectedRole(userType);
  }, [userType]);

  // Delete user data function
  const deleteUserData = async (userId: number, userType: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/delete-register`, {
        data: {
          userId: userId
        },
        headers: {
          'Content-Type': 'application/json',
          'userId': String(userId),
          'userType': userType
        }
      });
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      return false;
    }
  };

  // Clear registration state
  const clearRegistrationState = () => {
    setRegisteredUser(null);
    setActiveStep(0);
    setTeacherAssignments([]);
    setParentEntries([]);
    setValue("teacherGrades", []);
    setValue("subjects", []);
    setValue("teacherClass", []);
    setValue("medium", []);
    setValue("staffNo", "");
    setValue("studentGrade", "");
    setValue("studentClass", "");
    setValue("studentAdmissionNo", "");
    setValue("profession", "");
    setValue("relation", "");
    setValue("parentContact", "");
  };

  // Handle browser back button (popstate event) and page/tab close (beforeunload event)
  useEffect(() => {
    // Prevent going back with browser/phone back button if on step 1
    const handlePopstate = async (event: PopStateEvent) => {
      event.preventDefault();

      if (activeStep === 1 && registeredUser) {
        // Delete the registered user data
        await deleteUserData(registeredUser.userId, registeredUser.userType);
        clearRegistrationState();
        // Push a new state to prevent browser going back
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Show confirmation when trying to close tab/browser/page while on step 1
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (activeStep === 1 && registeredUser) {
        event.preventDefault();
        event.returnValue = '';

        // Delete the registered user data in the background
        deleteUserData(registeredUser.userId, registeredUser.userType);

        return '';
      }
    };

    // Add event listeners only when on step 1 with registered user
    if (activeStep === 1 && registeredUser) {
      window.addEventListener('popstate', handlePopstate);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Push a new state to enable popstate handling
      window.history.pushState(null, '', window.location.href);

      return () => {
        window.removeEventListener('popstate', handlePopstate);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [activeStep, registeredUser]);

  const extractErrorMessage = (error: any): string => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    if (error?.message) {
      return error.message;
    }
    return "An unexpected error occurred. Please try again.";
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorSnackbar(true);
    onError(message);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessSnackbar(true);
    onSuccess();
  };

  const { mutate: registerBasicUser, isPending: isRegisteringBasic } = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setRegisteredUser({ userId: data.userId, userType: data.userType });
      setActiveStep(1);
    },
    onError: (error: any) => {
      const errorMsg = extractErrorMessage(error);
      showError(errorMsg);
    },
  });

  const { mutate: registerStudentData, isPending: isRegisteringStudent } = useMutation({
    mutationFn: registerStudent,
    onSuccess: () => {
      showSuccess("Registration successful! Please contact the Admin to get access to Login.");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = extractErrorMessage(error);
      showError(errorMsg);
    },
  });

  const { mutate: registerTeacherData, isPending: isRegisteringTeacher } = useMutation({
    mutationFn: registerTeacher,
    onSuccess: () => {
      showSuccess("Registration successful! Please contact the Admin to get access to Login.");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = extractErrorMessage(error);
      showError(errorMsg);
    },
  });

  const { mutate: registerParentData, isPending: isRegisteringParent } = useMutation({
    mutationFn: registerParent,
    onSuccess: () => {
      showSuccess("Registration successful! Please contact the Admin to get access to Login.");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = extractErrorMessage(error);
      showError(errorMsg);
    },
  });

  const handleNext = async () => {
    let isValid = false;

    if (activeStep === 0) {
      isValid = await trigger([
        "name",
        "address",
        "email",
        "birthDay",
        "contact",
        "userType",
        "username",
        "password",
        "password_confirmation",
        "gender"
      ]);
    } else if (activeStep === 1) {
      if (selectedRole === "Teacher") {
        isValid = await trigger(["teacherGrades", "subjects", "teacherClass", "staffNo", "medium"]);
      } else if (selectedRole === "Student") {
        isValid = await trigger(["studentGrade", "studentAdmissionNo", "studentClass", "medium", "parentProfession", "parentContact"]);
      } else if (selectedRole === "Parent") {
        isValid = await trigger(["profession", "parentContact", "studentAdmissionNo", "relation"]);
      }
    }

    if (!isValid) return;

    if (activeStep === 0) {
      const formData = new FormData();
      const formValues = watch();

      Object.entries(formValues)
        .filter(([key]) => !['teacherGrades', 'teacherClass', 'subjects', 'medium'].includes(key))
        .forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'photo' && value instanceof FileList && value.length > 0) {
              formData.append(key, value[0]);
            } else if (typeof value === 'string' || value instanceof Blob) {
              formData.append(key, value);
            }
          }
        });

      const arrayFields = ['teacherGrades', 'teacherClass', 'subjects', 'medium'];
      arrayFields.forEach(field => {
        const fieldValue = formValues[field as keyof FormData];
        if (fieldValue && Array.isArray(fieldValue)) {
          fieldValue.forEach(item => {
            formData.append(`${field}[]`, item);
          });
        }
      });

      formData.append('userRole', 'user');

      registerBasicUser(formData);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = async () => {
    if (activeStep === 1 && registeredUser && registeredUser.userId) {
      try {
        // Delete the registered user
        await deleteUserData(registeredUser.userId, registeredUser.userType);

        // Clear local registration state without showing success snackbar
        clearRegistrationState();
      } catch (error: any) {
        console.error('Delete error:', error);
        const errorMessage = error?.response?.data?.message || "Failed to clear user data";
        showError(errorMessage);

        // still attempt to move back and clear local state to keep UI consistent
        setActiveStep((prevActiveStep) => Math.max(0, prevActiveStep - 1));
        setRegisteredUser(null);
      }
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const onSubmit = (data: RegisterFormValues) => {
    if (!registeredUser) return;

    const formData = new FormData();
    formData.append('userId', String(registeredUser.userId));
    formData.append('userType', String(registeredUser.userType));

    const role = (registeredUser.userType || '').toLowerCase();

    if (role === "teacher") {
      formData.append('staffNo', data.staffNo || '');

      const teacherPayload = teacherAssignments.map(assignment => ({
        teacherGrade: assignment.grades[0],
        teacherClass: assignment.classes[0],
        subject: assignment.subjects[0],
        medium: assignment.medium[0],
        staffNo: data.staffNo ?? '',
        userId: String(registeredUser.userId),
        userType: String(registeredUser.userType)
      }));

      formData.append('teacherAssignments', JSON.stringify(teacherPayload));
    }
    else if (role === "parent") {
      const parentAssignments = parentEntries && parentEntries.length > 0
        ? parentEntries.map(entry => ({
          studentAdmissionNo: entry.studentAdmissionNo,
          profession: entry.profession,
          relation: entry.relation,
          parentContact: entry.parentContact,
          userId: String(registeredUser.userId),
          userType: String(registeredUser.userType),
          status: entry.status ?? true,
          created_at: (entry as any).created_at ?? new Date().toISOString(),
          updated_at: (entry as any).updated_at ?? new Date().toISOString()
        }))
        : [{
          studentAdmissionNo: data.studentAdmissionNo ?? "",
          profession: data.profession ?? "",
          relation: data.relation ?? "",
          parentContact: data.parentContact ?? "",
          userId: String(registeredUser.userId),
          userType: String(registeredUser.userType),
          status: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];

      if (!parentAssignments.length || !parentAssignments[0].studentAdmissionNo) {
        showError("Please provide at least one parent entry with a Student Admission Number");
        return;
      }

      formData.append('parentData', JSON.stringify(parentAssignments));
    }
    else if (role === "student") {
      const studentAssignments = [{
        studentGrade: data.studentGrade,
        studentClass: data.studentClass,
        medium: data.medium,
        studentAdmissionNo: data.studentAdmissionNo,
        parentContact: data.parentContact,
        parentProfession: data.parentProfession,
        userId: String(registeredUser.userId),
        userType: String(registeredUser.userType)
      }];

      formData.append('studentData', JSON.stringify(studentAssignments));
    }

    if (role === "student") registerStudentData(formData);
    else if (role === "teacher") registerTeacherData(formData);
    else if (role === "parent") registerParentData(formData);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const handleAddAssignment = () => {
    const currentGrades = watch("teacherGrades") || [];
    const currentSubjects = watch("subjects") || [];
    const currentClasses = watch("teacherClass") || [];
    const currentMedium = watch("medium") || [];

    if (currentGrades.length && currentSubjects.length && currentClasses.length && currentMedium.length) {
      // Check for duplicates in existing assignments
      const isDuplicate = teacherAssignments.some(assignment => {
        const gradeMatch = assignment.grades[0] === currentGrades[0];
        const subjectMatch = assignment.subjects[0] === currentSubjects[0];
        const classMatch = assignment.classes[0] === currentClasses[0];
        const mediumMatch = assignment.medium[0] === currentMedium[0];
        
        return gradeMatch && subjectMatch && classMatch && mediumMatch;
      });

      if (isDuplicate) {
        showError("This combination of Grade, Subject, Class, and Medium already exists");
        return;
      }

      const newAssignment: TeacherAssignment = {
        grades: currentGrades,
        subjects: currentSubjects,
        classes: currentClasses,
        medium: Array.isArray(currentMedium) ? currentMedium : [currentMedium],
        id: crypto.randomUUID()
      };

      // Add new assignment to the top of the list (prepend)
      setTeacherAssignments(prev => [newAssignment, ...prev]);

      setValue("teacherGrades", []);
      setValue("subjects", []);
      setValue("teacherClass", []);
      setValue("medium", []);
    }
  };

  const handleAddParent = () => {
    const studentAdmissionNo = (watch("studentAdmissionNo") || "").toString().trim();
    const profession = (watch("profession") || "").toString().trim();
    const relation = (watch("relation") || "").toString().trim();
    const parentContact = (watch("parentContact") || "").toString().trim();

    // clear previous manual errors
    // (react-hook-form doesn't provide clearError, so reset by setting empty value or triggering validation)
    // We'll clear by triggering validation for these fields
    trigger(["studentAdmissionNo", "profession", "relation", "parentContact"]);

    const missingFields: { name: keyof RegisterFormValues; label: string }[] = [];
    if (!studentAdmissionNo) missingFields.push({ name: "studentAdmissionNo", label: "Student Admission Number" });
    if (!profession) missingFields.push({ name: "profession", label: "Profession" });
    if (!relation) missingFields.push({ name: "relation", label: "Relation" });
    if (!parentContact) missingFields.push({ name: "parentContact", label: "Contact Number" });

    if (missingFields.length > 0) {
      // set field-level errors so helperText / error states show
      missingFields.forEach(f => {
        setError(f.name as any, { type: "manual", message: `${f.label} is required` });
      });

      // optional: focus first missing field (not required)
      // alert to inform user (keeps behavior similar to before)
      alert("Please fill all parent fields: Admission No, Profession, Relation and Contact before adding.");
      return;
    }

    const newEntry: ParentEntry = {
      id: (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function")
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).substr(2, 9),
      studentAdmissionNo: String(studentAdmissionNo),
      profession: String(profession),
      relation: String(relation),
      parentContact: String(parentContact),
      status: true
    };

    // Add new entry to the top of the list (prepend)
    setParentEntries(prev => [newEntry, ...prev]);

    setValue("studentAdmissionNo", "");
    setValue("profession", "");
    setValue("relation", "");
    setValue("parentContact", "");
  };

  const handleCloseSuccessSnackbar = () => {
    setShowSuccessSnackbar(false);
  };

  const handleCloseErrorSnackbar = () => {
    setShowErrorSnackbar(false);
  };

  const isPending = isRegisteringBasic || isRegisteringStudent || isRegisteringTeacher || isRegisteringParent;

  return (
    <Box sx={{
      width: "100%",
      maxWidth: { xs: "100%", sm: 500 },
      overflowY: "auto",
      px: { xs: 2, sm: 0 }
    }}>
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSuccessSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSuccessSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showErrorSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseErrorSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseErrorSnackbar}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          '& .MuiStepLabel-label': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {registeredUser && activeStep === 1 && (
        <Box sx={{ mb: 2, p: 2, borderRadius: 1, color: 'black' }}>
          <strong>Role:</strong> {registeredUser.userType}
        </Box>
      )}

      <form onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
        {activeStep === 0 && (
          <Stack spacing={2}>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <TextField
                label="Full Name"
                fullWidth
                variant="outlined"
                {...register("name", { required: "Full name is required" })}
                error={!!errors.name}
                helperText={errors.name?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color={errors.name ? "error" : "action"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "40px"
                  }
                }}
              />
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <TextField
                label="Address"
                fullWidth
                variant="outlined"
                {...register("address", { required: "Address is required" })}
                error={!!errors.address}
                helperText={errors.address?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Home color={errors.address ? "error" : "action"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "40px"
                  }
                }}
              />
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <TextField
                label="Email"
                type="email"
                fullWidth
                variant="outlined"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color={errors.email ? "error" : "action"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "40px"
                  }
                }}
              />
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Birthday"
                  type="date"
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  {...register("birthDay", { required: "Birthday is required" })}
                  error={!!errors.birthDay}
                  helperText={errors.birthDay?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Cake color={errors.birthDay ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  variant="outlined"
                  {...register("contact", { required: "Phone is required" })}
                  error={!!errors.contact}
                  helperText={errors.contact?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color={errors.contact ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                />
              </Stack>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label="Role"
                  fullWidth
                  variant="outlined"
                  {...register("userType", {
                    required: "Role is required",
                    onChange: (e) => setSelectedRole(e.target.value)
                  })}
                  error={!!errors.userType}
                  helperText={errors.userType?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Work color={errors.userType ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Gender"
                  fullWidth
                  variant="outlined"
                  {...register("gender", {
                    required: "Gender is required"
                  })}
                  error={!!errors.gender}
                  helperText={errors.gender?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Work color={errors.gender ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                >
                  {gender.map((genderOption) => (
                    <MenuItem key={genderOption} value={genderOption}>
                      {genderOption}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <TextField
                label="Username"
                fullWidth
                variant="outlined"
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                })}
                error={!!errors.username}
                helperText={errors.username?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle color={errors.username ? "error" : "action"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "40px"
                  }
                }}
              />
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  variant="outlined"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color={errors.password ? "error" : passwordFocused ? "primary" : "action"} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                />
                <TextField
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  fullWidth
                  variant="outlined"
                  {...register("password_confirmation", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                  name="password_confirmation"
                  error={!!errors.password_confirmation}
                  helperText={errors.password_confirmation?.message}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color={errors.password_confirmation ? "error" : confirmPasswordFocused ? "primary" : "action"} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={handleClickShowConfirmPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "40px"
                    }
                  }}
                />
              </Stack>
            </motion.div>
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={2.5}>
            {selectedRole === "Teacher" && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Staff Number"
                    fullWidth
                    variant="outlined"
                    {...register("staffNo", { required: "Staff number is required" })}
                    error={!!errors.staffNo}
                    helperText={errors.staffNo?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AssignmentInd color={errors.staffNo ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        height: "55px"
                      }
                    }}
                  />

                  <TextField
                    select
                    label="Subjects"
                    fullWidth
                    variant="outlined"
                    SelectProps={{
                      value: watch("subjects") || [],
                      onChange: (e) => setValue("subjects", [e.target.value as string])
                    }}
                    error={!!errors.subjects}
                    helperText={errors.subjects?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Subject color={errors.subjects ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        minHeight: "40px"
                      }
                    }}
                  >
                    {isLoadingSubjects ? (
                      <MenuItem disabled>Loading subjects...</MenuItem>
                    ) : (
                      [...uniqueMainSubjects]
                        .sort((a: any, b: any) => String(a).localeCompare(String(b)))
                        .map((subject: any) => (
                          <MenuItem key={subject} value={subject}>
                            {subject}
                          </MenuItem>
                        ))
                    )}
                  </TextField>

                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Classes"
                    fullWidth
                    variant="outlined"
                    SelectProps={{
                      value: watch("teacherClass") || "",
                      onChange: (e) => {
                        const value = e.target.value as string;
                        setValue("teacherClass", [value]);
                      }
                    }}
                    {...register("teacherClass")}
                    error={!!errors.teacherClass}
                    helperText={errors.teacherClass?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Class color={errors.teacherClass ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        minHeight: "40px"
                      }
                    }}
                  >
                    {classes
                      .slice()
                      .sort((a: any, b: any) => a.class.localeCompare(b.class)) 
                      .map((classItem: any) => (
                        <MenuItem key={classItem.id} value={classItem.class}>
                          {classItem.class}
                        </MenuItem>
                      ))}
                  </TextField>

                  <TextField
                    select
                    label="Grades"
                    fullWidth
                    variant="outlined"
                    SelectProps={{
                      value: watch("teacherGrades") || "",
                      onChange: (e) => {
                        const value = e.target.value as string;
                        setValue("teacherGrades", [value]);
                      }
                    }}
                    {...register("teacherGrades")}
                    error={!!errors.teacherGrades}
                    helperText={errors.teacherGrades?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <School color={errors.teacherGrades ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        minHeight: "40px"
                      }
                    }}
                  >
                    {grades.map((grade: any) => (
                      <MenuItem key={grade.id} value={grade.grade}>
                        {grade.grade}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Medium"
                    fullWidth
                    variant="outlined"
                    SelectProps={{
                      value: watch("medium") || [],
                      onChange: (e) => {
                        const value = e.target.value as string;
                        setValue("medium", [value]);
                      }
                    }}
                    {...register("medium")}
                    error={!!errors.medium}
                    helperText={errors.medium?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Language color={errors.medium ? "error" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        minHeight: "40px"
                      }
                    }}
                  >
                    {mediumOptions.map((medium) => (
                      <MenuItem key={medium} value={medium}>
                        {medium}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Button
                  variant="contained"
                  onClick={handleAddAssignment}
                  sx={{
                    minWidth: '120px',
                    height: '40px',
                    borderRadius: '10px'
                  }}
                  startIcon={<Add />}
                >
                  Add to List
                </Button>

                {teacherAssignments.length > 0 && (
                  <Box sx={{ mt: 2, width: '100%' }}>
                    <TableContainer
                      component={Paper}
                      sx={{
                        maxHeight: 220,
                        overflowY: 'auto',
                        overflowX: { xs: 'auto', sm: 'hidden' }
                      }}
                    >
                      <Table stickyHeader sx={{ minWidth: { xs: 500, sm: 'auto' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Grades</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Classes</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Medium</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Subjects</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {teacherAssignments.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{assignment.grades.join(", ")}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{assignment.classes.join(", ")}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{assignment.medium.join(", ")}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{assignment.subjects.join(", ")}</TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => {
                                    setTeacherAssignments(prev =>
                                      prev.filter(item => item.id !== assignment.id)
                                    );
                                  }}
                                  size="small"
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}

            {selectedRole === "Student" && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Grade"
                    fullWidth
                    variant="outlined"
                    {...register("studentGrade", { required: "Grade is required" })}
                    error={!!errors.studentGrade}
                    helperText={errors.studentGrade?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  >
                    {grades
                      .slice()
                      .sort((a: any, b: any) => {
                        const gradeNumA = parseInt(a.grade?.replace(/[^\d]/g, '') || '0', 10);
                        const gradeNumB = parseInt(b.grade?.replace(/[^\d]/g, '') || '0', 10);
                        return gradeNumA - gradeNumB;
                      })
                      .map((g: any) => <MenuItem key={g.id} value={g.grade}>{g.grade}</MenuItem>)}
                  </TextField>

                  <TextField
                    select
                    label="Class"
                    fullWidth
                    variant="outlined"
                    {...register("studentClass", { required: "Class is required" })}
                    error={!!errors.studentClass}
                    helperText={errors.studentClass?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  >
                    {classes
                      .slice()
                      .sort((a: any, b: any) => a.class.localeCompare(b.class))
                      .map((c: any) => <MenuItem key={c.id} value={c.class}>{c.class}</MenuItem>)}
                  </TextField>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Medium"
                    fullWidth
                    variant="outlined"
                    {...register("medium", { required: "Medium is required" })}
                    error={!!errors.medium}
                    helperText={errors.medium?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  >
                    {mediumOptions.map((m) => <MenuItem key={m} value={m.toLowerCase()}>{m}</MenuItem>)}
                  </TextField>

                  <TextField
                    label="Admission Number"
                    fullWidth
                    variant="outlined"
                    {...register("studentAdmissionNo", { required: "Admission number is required" })}
                    error={!!errors.studentAdmissionNo}
                    helperText={errors.studentAdmissionNo?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  />
                </Stack>
              </>
            )}

            {selectedRole === "Parent" && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Student Admission Number"
                    fullWidth
                    variant="outlined"
                    {...register("studentAdmissionNo")}
                    error={!!errors.studentAdmissionNo}
                    helperText={errors.studentAdmissionNo?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  />
                  <TextField
                    label="Contact Number"
                    fullWidth
                    variant="outlined"
                    {...register("parentContact")}
                    error={!!errors.parentContact}
                    helperText={errors.parentContact?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Profession"
                    fullWidth
                    variant="outlined"
                    {...register("profession")}
                    error={!!errors.profession}
                    helperText={errors.profession?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  />
                  <TextField
                    select
                    label="Relation"
                    fullWidth
                    variant="outlined"
                    {...register("relation")}
                    error={!!errors.relation}
                    helperText={errors.relation?.message}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "40px" } }}
                  >
                    <MenuItem value="Mother">Mother</MenuItem>
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Guardian">Guardian</MenuItem>
                  </TextField>
                </Stack>

                <Button
                  variant="contained"
                  onClick={handleAddParent}
                  sx={{
                    minWidth: '120px',
                    height: '40px',
                    borderRadius: '10px'
                  }}
                  startIcon={<Add />}
                >
                  Add to List
                </Button>

                {parentEntries.length > 0 && (
                  <Box sx={{ mt: 2, width: '100%' }}>
                    <TableContainer
                      component={Paper}
                      sx={{
                        maxHeight: 220,
                        overflowY: 'auto',
                        overflowX: { xs: 'auto', sm: 'hidden' }
                      }}
                    >
                      <Table stickyHeader sx={{ minWidth: { xs: 500, sm: 'auto' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Admission No</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Profession</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Relation</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Contact</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parentEntries.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{p.studentAdmissionNo}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{p.profession}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{p.relation}</TableCell>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{p.parentContact}</TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => setParentEntries(prev => prev.filter(x => x.id !== p.id))}
                                  size="small"
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Stack>
        )}

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 },
          pt: 2
        }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{
              mr: { sm: 1 },
              order: { xs: 2, sm: 1 }
            }}
            startIcon={isPending && <CircularProgress size={20} />}
          >
            Back
          </Button>
          <Box sx={{ flex: '1 1 auto', display: { xs: 'none', sm: 'block' } }} />

          {activeStep === steps.length - 1 ? (
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              fullWidth={true}
              sx={{ order: { xs: 1, sm: 2 }, width: { sm: 'auto' } }}
            >
              {isPending ? <CircularProgress size={24} /> : 'Sign Up'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={isPending}
              fullWidth={true}
              sx={{ order: { xs: 1, sm: 2 }, width: { sm: 'auto' } }}
            >
              {isPending ? <CircularProgress size={24} /> : 'Next'}
            </Button>
          )}
        </Box>

        {activeStep === 0 && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link to="/login">
              <Button startIcon={<AccountCircle />}>
                Already have an account? Sign In
              </Button>
            </Link>
          </Box>
        )}
      </form>
    </Box>
  );
};

export default RegisterForm;