import React, { useState, useRef, useEffect } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Stack,
  AppBar,
  CssBaseline,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery
} from "@mui/material";
import { FaFileExcel } from 'react-icons/fa';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  type GridColDef,
  GridActionsCellItem,
  type GridRowId,
  type GridRowParams
} from "@mui/x-data-grid";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add,
  Delete as DeleteRowIcon,
  CloudUpload as CloudUploadIcon,
  DeleteForever as DeleteForeverIcon,
  CheckCircle as ActivateIcon 
} from "@mui/icons-material";
import Sidebar from "../../components/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomTheme } from "../../context/ThemeContext";
import {
  type User,
  type UserRole,
  type Subject,
  statusOptions,
  genderOptions,
  relationOptions,
  userRoleOptions,
  userTypeOptions,
  mediumOptions,
  type TeacherAssignment
} from "../../types/userManagementTypes";
import {
  bulkDeactivateUsers,
  createUser,
  deactivateUser,
  fetchUsers,
  getUserRole,
  searchUsers,
  fetchSubjects,
  updateUser,
  deleteUser,
  activateUser,
  fetchGrades,
  fetchClasses,
  type Grade,
  type Class
} from "../../api/userManagementApi";
import Navbar from "../../components/Navbar";
import { debounce } from 'lodash';

type UserCategory = 'Student' | 'Teacher' | 'Parent' | 'ManagementStaff';

interface FormState extends Omit<User, 'id'> {
  id?: number;
  teacherClass: string[];
  teacherGrade: string;
  teacherGrades: string[];
  studentClass?: string;
  studentGrade?: string;
  userRole: UserRole;
}

type ParentEntry = {
  id: string;
  relation: string;
  profession: string;
  parentContact: string;
  studentAdmissionNo: string;
};

type StaffEntry = {
  id: string;
  designation: string;
  department: string;
  staffContact: string;
  staffId: string;
};

const UserManagement: React.FC = () => {
  const PASSWORD_MASK = '********';
  const [form, setForm] = useState<FormState>({
    name: "",
    username: "",
    email: "",
    userType: "Student",
    userRole: "user",
    status: true,
    password: "",
    contact: "",
    address: "",
    birthDay: "",
    gender: "",
    photo: null,
    grade: "",
    class: "",
    medium: "",
    subject: "",
    relation: "",
    profession: "",
    parentContact: "",
    studentAdmissionNo: "",
    studentClass: "",
    teacherClass: [],
    studentGrade: "",
    teacherGrade: "",
    teacherGrades: [],
    designation: "",
    department: "",
    staffContact: "",
    staffId: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error"
  });
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowId[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<UserCategory>('Student');
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [parentEntries, setParentEntries] = useState<ParentEntry[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dataGridRef = useRef<any>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  useCustomTheme();

  const queryClient = useQueryClient();

  // Scroll to top function
  const scrollToTop = () => {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { data: allUsers = [], isLoading: isDataLoading, refetch } = useQuery<User[]>({
    queryKey: ["users", activeTab],
    queryFn: async () => {
      const data = await fetchUsers(activeTab);
      // Sort by ID descending to show newest first
      return data.sort((a, b) => (b.id || 0) - (a.id || 0));
    },
  });

  const users = allUsers;

  const { data: apiSearchResults = [], isLoading: isSearching, refetch: searchRefetch } = useQuery({
    queryKey: ["searchUsers", searchTerm, activeTab],
    queryFn: () => searchUsers(searchTerm, activeTab),
    enabled: false,
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: fetchSubjects
  });

  const { data: grades = [], isLoading: isLoadingGrades } = useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: fetchGrades
  });

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: fetchClasses
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User created successfully!", "success");
      handleClear();
      // Scroll to top after creating user
      scrollToTop();
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      const errorMessage = error.response?.data?.message || "Failed to create user";
      const errors = error.response?.data?.errors;
      if (errors) {
        const errorMsg = typeof errors === 'object'
          ? Object.values(errors).flat().join(", ")
          : String(errors);
        showSnackbar(errorMsg, "error");
      } else {
        showSnackbar(errorMessage, "error");
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (userData: User) => updateUser(userData.id as number, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User updated successfully!", "success");
      handleClear();
      // Scroll to top after updating user
      scrollToTop();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Failed to update user";
      const errors = error.response?.data?.errors;
      if (errors) {
        showSnackbar(Object.values(errors).flat().join(", "), "error");
      } else {
        showSnackbar(errorMessage, "error");
      }
    }
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (id: number) => deactivateUser(id, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User deactivated successfully!", "success");
    },
    onError: (error: any) => {
      showSnackbar(error.response?.data?.message || "Failed to deactivate user", "error");
    }
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeactivateUsers(ids, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar(`${rowSelectionModel.length} users deactivated successfully!`, "success");
      setRowSelectionModel([]);
    },
    onError: () => {
      showSnackbar("Error deactivating some users", "error");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", activeTab] });
      showSnackbar("User deleted successfully!", "success");
      setRowSelectionModel([]); // Clear any selections
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete user";
      showSnackbar(message, "error");
    }
  });

  const activateUserMutation = useMutation({
    mutationFn: (params: { id: number; userType: UserCategory }) => activateUser(params.id, params.userType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User activated successfully!", "success");
    },
    onError: (error: any) => {
      showSnackbar(error.response?.data?.message || "Failed to activate user", "error");
    }
  });

  // delete handler uses deleteUserMutation (must be inside component)
  const handleDelete = (id: number) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleActivate = (id: number) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to activate this user?")) {
      activateUserMutation.mutate({ id, userType: activeTab });
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

  };

  const handleSelectChange = (e: React.ChangeEvent<{ value: unknown }>, field: keyof User) => {
    const value = e.target.value;
    if (field === 'status') {
      setForm(prev => ({
        ...prev,
        [field]: value === 'true' || value === true
      }));
    } else {
      // Keep form in sync
      setForm(prev => ({
        ...prev,
        [field]: value
      }));

    }
  };

  const handleAddAssignment = () => {
    if (!form.grade || !form.class || !form.subject || !form.medium) {
      showSnackbar("Please fill all required fields for teacher assignment", "error");
      return;
    }

    const newAssignment: TeacherAssignment = {
      id: Math.random().toString(36).substr(2, 9),
      teacherGrade: form.grade,
      teacherClass: form.class,
      subject: form.subject,
      medium: form.medium,
      staffNo: form.staffNo || ''
    };

    setTeacherAssignments(prev => [...prev, newAssignment]);

    setForm(prev => ({
      ...prev,
      grade: "",
      class: "",
      subject: "",
      medium: ""
    }));
  };

  const handleAddParent = () => {
    if (!form.relation && !form.parentContact && !form.studentAdmissionNo && !form.profession) {
      showSnackbar("Please fill at least one parent field before adding", "error");
      return;
    }

    const newParent: ParentEntry = {
      id: Math.random().toString(36).substr(2, 9),
      relation: form.relation || '',
      profession: form.profession || '',
      parentContact: form.parentContact || '',
      studentAdmissionNo: form.studentAdmissionNo || ''
    };

    setParentEntries(prev => [...prev, newParent]);

    setForm(prev => ({
      ...prev,
      relation: "",
      profession: "",
      parentContact: "",
      studentAdmissionNo: ""
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.username || !form.email || (editId === null && !form.password)) {
      showSnackbar("Please fill all required fields!", "error");
      return;
    }

    if (activeTab === 'Teacher') {
      if ((!form.grade || !form.class || !form.subject || !form.medium) && teacherAssignments.length === 0) {
        showSnackbar("Please fill all required teacher fields (Grade, Class, Subject, and Medium)!", "error");
        return;
      }
    }

    // Determine whether to send password:
    // For Staff updates, never send password. For other types, send only if explicitly changed.
    const passwordToSend =
      activeTab === 'ManagementStaff' && editId !== null
        ? undefined
        : editId === null
          ? form.password
          : (form.password && form.password !== PASSWORD_MASK ? form.password : undefined); 

    const baseUserData: any = {
      name: form.name,
      username: form.username,
      email: form.email,
      // include password only when it's provided (avoid sending the mask)
      ...(passwordToSend !== undefined ? { password: passwordToSend } : {}),
      userType: activeTab,
      userRole: form.userRole,
      status: form.status,
      contact: form.contact || '',
      address: form.address || '',
      birthDay: form.birthDay || '',
      gender: form.gender || '',
      photo: form.photo || null,
      parentContact: form.parentContact || ''
    };

    let userData: User;

    switch (activeTab) {
      case 'Teacher':
        const teacherAssignment = {
          teacherGrade: form.grade || '',
          teacherClass: form.class || '',
          subject: form.subject || '',
          medium: form.medium || '',
          staffNo: form.staffNo || ''
        };

        userData = {
          ...baseUserData,
          photo: form.photo === "" ? null : form.photo,
          staffNo: form.staffNo || '',
          grade: form.grade || '',
          class: form.class || '',
          subject: form.subject || '',
          medium: form.medium || '',
          teacherAssignments: teacherAssignments.length > 0 ? teacherAssignments : [teacherAssignment],
          teacherData: teacherAssignments.length > 0 ? teacherAssignments : [teacherAssignment]
        } as User;
        break;

      case 'Student':
        userData = {
          ...baseUserData,
          grade: form.grade || '',
          class: form.class || '',
          medium: form.medium || '',
          studentAdmissionNo: form.studentAdmissionNo || '',
          studentGrade: form.grade || '',
          studentClass: form.class || '',
          studentData: {
            studentGrade: form.grade || '',
            studentClass: form.class || '',
            medium: form.medium || '',
            studentAdmissionNo: form.studentAdmissionNo || ''
          }
        };
        break;

      case 'Parent': {
        const firstParent = parentEntries.length > 0 ? parentEntries[0] : null;

        // Ensure we always send parentData as an ARRAY (backend expects 'parentData' field)
        const mappedEntries = parentEntries.length > 0
          ? parentEntries.map(p => ({
            relation: p.relation || '',
            profession: p.profession || '',
            parentContact: p.parentContact || '',
            studentAdmissionNo: p.studentAdmissionNo || ''
          }))
          : [{
            relation: form.relation || (firstParent?.relation ?? '') || '',
            profession: form.profession || (firstParent?.profession ?? '') || '',
            parentContact: form.parentContact || (firstParent?.parentContact ?? '') || '',
            studentAdmissionNo: form.studentAdmissionNo || (firstParent?.studentAdmissionNo ?? '') || ''
          }];

        userData = {
          ...baseUserData,
          profession: mappedEntries[0].profession,
          studentAdmissionNo: mappedEntries[0].studentAdmissionNo,
          relation: mappedEntries[0].relation,
          parentContact: mappedEntries[0].parentContact,
          parentEntries: mappedEntries,
          parentData: mappedEntries
        } as unknown as User;
        break;
      }

      case 'ManagementStaff': {
        // For Staff, we handle just a single entry (no array support)
        userData = {
          ...baseUserData,
          designation: form.designation || '',
          department: form.department || '',
          staffContact: form.staffContact || '',
          staffId: form.staffId || '',
          staffData: [{
            designation: form.designation || '',
            department: form.department || '',
            staffContact: form.staffContact || '',
            staffId: form.staffId || ''
          }]
        } as unknown as User;
        break;
      }

      default:
        userData = baseUserData;
    }

    if (editId !== null) {
      userData = { ...userData, id: editId };
      
      if ((userData as any).password === undefined) {
        delete (userData as any).password;
      }
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handleClear = () => {
    setForm({
      name: "",
      username: "",
      email: "",
      userType: activeTab,
      userRole: getUserRole(activeTab),
      status: true,
      password: "",
      contact: "",
      address: "",
      birthDay: "",
      gender: "",
      photo: null,
      grade: "",
      class: "",
      medium: "",
      parentContact: "",
      subject: "",
      profession: "",
      relation: "",
      studentAdmissionNo: "",
      studentClass: "",
      teacherClass: [],
      studentGrade: "",
      teacherGrade: "",
      teacherGrades: [],
      designation: "",
      department: "",
      staffContact: "",
      staffId: "",
    });
    setTeacherAssignments([]);
    setParentEntries([]);
    setEditId(null);
  };

  const handleEdit = (id: number) => {
    const userToEdit = (searchTerm ? apiSearchResults : users).find(user => user.id === id);
    if (userToEdit) {
      // Set the form data first
      setForm({
        ...userToEdit,
        photo: userToEdit.photo || '',
        // show masked value in the password field when editing (won't be sent unless changed)
        password: PASSWORD_MASK,
        userRole: userToEdit.userRole || getUserRole(userToEdit.userType),
        teacherClass: userToEdit.teacherData?.map(td => td.teacherClass) || [],
        teacherGrade: userToEdit.teacherData?.[0]?.teacherGrade || '',
        teacherGrades: userToEdit.teacherData?.map(td => td.teacherGrade) || [],
        profession: (userToEdit as any).profession || '',
        relation: (userToEdit as any).relation || '',
        parentContact: (userToEdit as any).parentContact || '',
        studentAdmissionNo: (userToEdit as any).studentAdmissionNo || '',
        designation: (userToEdit as any).designation || '',
        department: (userToEdit as any).department || '',
        staffContact: (userToEdit as any).staffContact || '',
        staffId: (userToEdit as any).staffId || ''
      });
      setEditId(id);

      if (userToEdit.userType === 'Teacher' && userToEdit.teacherData) {
        setTeacherAssignments(userToEdit.teacherData.map(td => ({
          id: Math.random().toString(36).substr(2, 9),
          ...td
        })));
      }

      if (userToEdit.userType === 'Parent') {
        // Use normalizer to get a consistent parentEntries array
        const normalized = normalizeParentEntries(userToEdit);
        if (normalized.length > 0) {
          setParentEntries(normalized);
        } else {
          setParentEntries([]);
        }
      }

      // Auto scroll to top when editing
      scrollToTop();
    }
  };

  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this user?")) {
      deactivateUserMutation.mutate(id);
    }
  };

  const handleBulkDeactivate = () => {
    if (rowSelectionModel.length === 0) {
      showSnackbar("Please select users to deactivate", "error");
      return;
    }

    if (window.confirm(`Are you sure you want to deactivate ${rowSelectionModel.length} selected users?`)) {
      bulkDeactivateMutation.mutate(rowSelectionModel as number[]);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4"
    });

    const dataToExport = searchTerm ? apiSearchResults : users;

    const tableData: any[] = [];

    if (activeTab === 'Student') {
      dataToExport.forEach(user => {
        tableData.push([
          user.name || "-",
          user.username || "-",
          user.email || "-",
          user.address || "-",
          user.birthDay || "-",
          user.contact || "-",
          user.gender || "-",
          user.grade || "-",
          user.studentAdmissionNo || "-",
          user.class || user.grade || "-",
          user.medium || "-",
          user.status ? "Active" : "Inactive"
        ]);
      });
    } else if (activeTab === 'Teacher') {
      dataToExport.forEach(user => {
        const assignments = getTeacherAssignmentsForExport(user);
        if (assignments.length === 0) {
          tableData.push([
            user.name || "-",
            user.username || "-",
            user.email || "-",
            user.address || "-",
            user.birthDay || "-",
            user.contact || "-",
            user.gender || "-",
            user.medium || "-",
            user.grade || user.class || "-",
            user.subject || "-",
            user.status ? "Active" : "Inactive"
          ]);
        } else {
          assignments.forEach((a: { medium: any; teacherGrade: any; teacherClass: any; subject: any; }) => {
            tableData.push([
              user.name || "-",
              user.username || "-",
              user.email || "-",
              user.address || "-",
              user.birthDay || "-",
              user.contact || "-",
              user.gender || "-",
              a.medium || user.medium || "-",
              a.teacherGrade || a.teacherClass || user.grade || "-",
              a.subject || "-",
              user.status ? "Active" : "Inactive"
            ]);
          });
        }
      });
    } else if (activeTab === 'Parent') {
      dataToExport.forEach(user => {
        const entries = getParentEntriesForExport(user);
        if (entries.length === 0) {
          tableData.push([
            user.name || "-",
            user.username || "-",
            user.email || "-",
            user.address || "-",
            user.birthDay || "-",
            user.contact || "-",
            user.gender || "-",
            user.relation || "-",
            user.profession || "-",
            user.parentContact || user.contact || "-",
            user.studentAdmissionNo || "-",
            user.status ? "Active" : "Inactive"
          ]);
        } else {
          entries.forEach(ent => {
            // Put user details + per-parent columns in desired order:
            // Relation, Profession, Parent Contact, Student Admission No (you asked for that order)
            tableData.push([
              user.name || "-",
              user.username || "-",
              user.email || "-",
              user.address || "-",
              user.birthDay || "-",
              user.contact || "-",
              user.gender || "-",
              ent.relation || "-",
              ent.profession || "-",
              ent.parentContact || "-",
              ent.studentAdmissionNo || "-",
              user.status ? "Active" : "Inactive"
            ]);
          });
        }
      });
    } else if (activeTab === 'ManagementStaff') {
      dataToExport.forEach(user => {
        const entries = getStaffEntriesForExport(user);
        if (entries.length === 0) {
          tableData.push([
            user.name || "-",
            user.username || "-",
            user.email || "-",
            user.address || "-",
            user.birthDay || "-",
            user.contact || "-",
            user.gender || "-",
            user.designation || "-",
            user.department || "-",
            user.staffContact || user.contact || "-",
            user.staffId || "-",
            user.status ? "Active" : "Inactive"
          ]);
        } else {
          entries.forEach(ent => {
            tableData.push([
              user.name || "-",
              user.username || "-",
              user.email || "-",
              user.address || "-",
              user.birthDay || "-",
              user.contact || "-",
              user.gender || "-",
              ent.designation || "-",
              ent.department || "-",
              ent.staffContact || "-",
              ent.staffId || "-",
              user.status ? "Active" : "Inactive"
            ]);
          });
        }
      });
    }

    const headers: any = {
      Student: [
        "Name","Username","Email","Address","Birthday","Phone No","Gender","Grade","Admission No","Class","Medium","Status"
      ],
      Teacher: [
        "Name","Username","Email","Address","Birthday","Phone No","Gender","Medium","Grade","Subject","Status"
      ],
      Parent: [
        "Name","Username","Email","Address","Birthday","Phone No","Gender","Relation","Profession","Parent Contact","Student Admission No","Status"
      ],
      ManagementStaff: [
        "Name","Username","Email","Address","Birthday","Phone No","Gender","Designation","Department","Staff Contact","Staff ID","Status"
      ]
    };

    doc.setFontSize(16);
    doc.text(`${activeTab} Management Report`, 40, 40);

    const margin = { left: 40, right: 40 };
    const pageWidth = (doc.internal.pageSize && (doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width)) as number;
    const availableWidth = pageWidth - margin.left - margin.right;
    const colCount = headers[activeTab as keyof typeof headers].length;
    const computedColWidth = Math.floor(availableWidth / colCount);

    const columnStyles: any = {};
    for (let i = 0; i < colCount; i++) {
      columnStyles[i] = { cellWidth: computedColWidth };
    }

    autoTable(doc, {
      startY: 60,
      head: [headers[activeTab as keyof typeof headers]],
      body: tableData,
      theme: "grid",
      margin,
      styles: {
        fontSize: 9,
        cellPadding: 5,
        valign: "middle",
        halign: "left",
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles,
      tableWidth: 'auto',
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).getNumberOfPages
          ? (doc as any).getNumberOfPages()
          : ((doc as any).internal?.pages?.length ?? 1);
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width - 100,
          doc.internal.pageSize.height - 20
        );
      },
    });

    doc.save(`${activeTab.toLowerCase()}-management-report.pdf`);
  };

  const handleExportExcel = () => {
    const dataToExport = searchTerm ? apiSearchResults : users;

    const excelRows: any[] = [];

    dataToExport.forEach(user => {
      const base = {
        'Name': user.name || '',
        'Username': user.username || '',
        'Email': user.email || '',
        'Address': user.address || '-',
        'Birthday': user.birthDay || '-',
        'Phone No': user.contact || '-',
        'Gender': user.gender || '-',
        'Status': user.status ? 'Active' : 'Inactive'
      };

      if (activeTab === 'Student') {
        excelRows.push({
          ...base,
          'Grade': user.grade || '-',
          'Admission No': user.studentAdmissionNo || '-',
          'Class': user.class || user.grade || '-',
          'Medium': user.medium || '-'
        });
      } else if (activeTab === 'Teacher') {
        const assignments = getTeacherAssignmentsForExport(user);
        if (assignments.length === 0) {
          excelRows.push({
            ...base,
            'Grade': user.grade || '-',
            'Class': user.class || '-',
            'Subject': user.subject || '-',
            'Medium': user.medium || '-'
          });
        } else {
          assignments.forEach((a: { teacherGrade: any; teacherClass: any; subject: any; medium: any; }) => {
            excelRows.push({
              ...base,
              'Grade': a.teacherGrade || '-',
              'Class': a.teacherClass || '-',
              'Subject': a.subject || '-',
              'Medium': a.medium || '-'
            });
          });
        }
      } else if (activeTab === 'Parent') {
        const entries = getParentEntriesForExport(user);
        if (entries.length === 0) {
          excelRows.push({
            ...base,
            'Relation': user.relation || '-',
            'Profession': user.profession || '-',
            'Parent Contact': user.parentContact || user.contact || '-',
            'Student Admission No': user.studentAdmissionNo || '-'
          });
        } else {
          entries.forEach(ent => {
            excelRows.push({
              ...base,
              'Relation': ent.relation || '-',
              'Profession': ent.profession || '-',
              'Parent Contact': ent.parentContact || '-',
              'Student Admission No': ent.studentAdmissionNo || '-'
            });
          });
        }
      } else if (activeTab === 'ManagementStaff') {
        const entries = getStaffEntriesForExport(user);
        if (entries.length === 0) {
          excelRows.push({
            ...base,
            'Designation': user.designation || '-',
            'Department': user.department || '-',
            'Staff Contact': user.staffContact || user.contact || '-',
            'Staff ID': user.staffId || '-'
          });
        } else {
          entries.forEach(ent => {
            excelRows.push({
              ...base,
              'Designation': ent.designation || '-',
              'Department': ent.department || '-',
              'Staff Contact': ent.staffContact || '-',
              'Staff ID': ent.staffId || '-'
            });
          });
        }
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab}s`);

    // set col widths based on longest cell
    const maxWidth = excelRows.reduce((w: any, r: any) => {
      return Object.keys(r).map((k, i) =>
        Math.max(w[i] || 10, String(r[k]).length)
      );
    }, []);
    worksheet['!cols'] = maxWidth.map((w: number) => ({ wch: w + 2 }));

    XLSX.writeFile(workbook, `${activeTab.toLowerCase()}-management-report.xlsx`);
    showSnackbar("Excel file exported successfully!", "success");
  };
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: UserCategory) => {
    setActiveTab(newValue);
    setForm(prev => ({
      ...prev,
      userType: newValue,
      userRole: editId === null ? getUserRole(newValue) : prev.userRole
    }));
    setSearchTerm("");
  };

  const debouncedSearch = useRef(
    debounce((term: string) => {
      if (term.trim() === "") {
        return;
      }
      searchRefetch();
    }, 500)
  ).current;

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const isMutating = createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deactivateUserMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    deleteUserMutation.isPending;

  const getColumns = (): GridColDef<User>[] => {
    const commonColumns: GridColDef<User>[] = [
      { field: 'id', headerName: 'ID', minWidth: 80 },
      { field: 'name', headerName: 'Name', minWidth: 150 },
      { field: 'username', headerName: 'Username', minWidth: 140 },
      { field: 'email', headerName: 'Email', minWidth: 180 },
      { field: 'address', headerName: 'Address', minWidth: 160 },
      { field: 'birthDay', headerName: 'Birthday', minWidth: 130 },
      { field: 'contact', headerName: 'Phone No', minWidth: 130 },
      { field: 'gender', headerName: 'Gender', minWidth: 110 },
    ];

    const statusColumn: GridColDef<User> = {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      type: 'boolean',
      renderCell: (params) => (
        <Box
          sx={{
            color: params.value ? theme.palette.success.main : theme.palette.error.main,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: params.value ? theme.palette.success.main : theme.palette.error.main
            }}
          />
          {params.value ? 'Active' : 'Inactive'}
        </Box>
      )
    };

    const actionColumn: GridColDef<User> = {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      minWidth: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.id as number)}
          showInMenu
        />,
        // new Activate button just after Edit
        <GridActionsCellItem
          icon={<ActivateIcon color="success" />}
          label="Activate"
          onClick={() => handleActivate(params.id as number)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label="Deactivate"
          onClick={() => handleDeactivate(params.id as number)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<DeleteForeverIcon color="error" />}
          label="Delete"
          onClick={() => handleDelete(params.id as number)}
          showInMenu
        />,
      ],
    };

    switch (activeTab) {
      case 'Student':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', minWidth: 110 },
          { field: 'medium', headerName: 'Medium', minWidth: 110 },
          { field: 'class', headerName: 'Class', minWidth: 110 },
          { field: 'studentAdmissionNo', headerName: 'Admission No', minWidth: 150 },
          statusColumn,
          actionColumn
        ];
      case 'Teacher':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', minWidth: 110 },
          { field: 'class', headerName: 'Class', minWidth: 110 },
          { field: 'subject', headerName: 'Subject', minWidth: 140 },
          { field: 'medium', headerName: 'Medium', minWidth: 110 },
          statusColumn,
          actionColumn
        ];
      case 'Parent':
        return [
          ...commonColumns,
          {
            field: 'profession',
            headerName: 'Profession',
            minWidth: 130,
            renderCell: (params) => {
              const entries = normalizeParentEntries(params.row);
              const vals = entries.map(e => e.profession).filter(Boolean);
              return vals.length ? vals.join(', ') : (params.row.profession || '-');
            }
          },
          {
            field: 'parentContact',
            headerName: 'Parent No',
            minWidth: 130,
            renderCell: (params) => {
              const entries = normalizeParentEntries(params.row);
              const vals = entries.map(e => e.parentContact).filter(Boolean);
              return vals.length ? vals.join(', ') : (params.row.parentContact || '-');
            }
          },
          {
            field: 'studentAdmissionNo',
            headerName: 'Admission No',
            minWidth: 150,
            renderCell: (params) => {
              const entries = normalizeParentEntries(params.row);
              const vals = entries.map(e => e.studentAdmissionNo).filter(Boolean);
              return vals.length ? vals.join(', ') : (params.row.studentAdmissionNo || '-');
            }
          },
          {
            field: 'relation',
            headerName: 'Relation',
            minWidth: 130,
            renderCell: (params) => {
              const entries = normalizeParentEntries(params.row);
              const vals = entries.map(e => e.relation).filter(Boolean);
              return vals.length ? vals.join(', ') : (params.row.relation || '-');
            }
          },
          statusColumn,
          actionColumn
        ];
      case 'ManagementStaff':
        return [
          ...commonColumns,
          
          statusColumn,
          actionColumn
        ];
      default:
        return [...commonColumns, statusColumn, actionColumn];
    }
  };

  const columns = getColumns();

  function CustomToolbar() {
    return (
      <GridToolbarContainer sx={{
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1 : 0,
        p: 1
      }}>
        <Stack direction="row" spacing={1} sx={{ width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => refetch()} size={isMobile ? 'small' : 'medium'}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export PDF">
            <IconButton onClick={handleExportPDF} size={isMobile ? 'small' : 'medium'} color="default">
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Excel">
            <IconButton onClick={handleExportExcel} size={isMobile ? 'small' : 'medium'} color="success">
              <FaFileExcel />
            </IconButton>
          </Tooltip>
          {rowSelectionModel.length > 0 && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDeactivate}
              size="small"
              fullWidth={isMobile}
            >
              Deactivate Selected
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          <GridToolbarColumnsButton />
          <GridToolbarFilterButton />
          <GridToolbarExport />
        </Stack>
      </GridToolbarContainer>
    );
  }

  const displayData = searchTerm ? apiSearchResults : users;

  const renderFormFields = () => {
    const commonFields = (
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: isMobile ? 1.5 : 2
      }}>
        <TextField
          label="Name*"
          name="name"
          value={form.name}
          onChange={handleChange}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          label="Username*"
          name="username"
          value={form.username}
          onChange={handleChange}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          label="Email*"
          name="email"
          value={form.email}
          onChange={handleChange}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          label="Address"
          name="address"
          value={form.address || ''}
          onChange={handleChange}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          label="Birthday"
          type="date"
          name="birthDay"
          value={form.birthDay || ''}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          label="Phone No"
          name="contact"
          value={form.contact || ''}
          onChange={handleChange}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        />
        <TextField
          type="file"
          label="Upload Photo"
          name="photo"
          onChange={async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              try {
                const processedImage = await processImage(file);
                setForm(prev => ({
                  ...prev,
                  photo: processedImage || ''
                }));
              } catch (error: any) {
                showSnackbar(error.message, "error");
              }
            }
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 120 }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  color="primary"
                  aria-label="upload photo"
                  component="span"
                  size="small"
                >
                  <CloudUploadIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="User Role"
          name="userRole"
          value={form.userRole || ''}
          onChange={(e) => handleSelectChange(e, "userRole")}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        >
          {userRoleOptions.map((userRole: string) => (
            <MenuItem key={userRole} value={userRole}>
              {userRole}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="User Type"
          name="userType"
          value={form.userType || ''}
          onChange={(e) => handleSelectChange(e, "userType")}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        >
          {userTypeOptions.map((userType: string) => (
            <MenuItem key={userType} value={userType}>
              {userType}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Gender"
          name="gender"
          value={form.gender || ''}
          onChange={(e) => handleSelectChange(e, "gender")}
          sx={{ minWidth: isMobile ? 'auto' : 120 }}
          size="small"
          fullWidth
        >
          {genderOptions.map((gender: string) => (
            <MenuItem key={gender} value={gender}>
              {gender}
            </MenuItem>
          ))}
        </TextField>

        {editId === null ? (
          <>
            <TextField
              label="Password*"
              name="password"
              type="password"
              value={form.password || ''}
              onChange={handleChange}
              sx={{ minWidth: isMobile ? 'auto' : 120 }}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Status"
              name="status"
              value={form.status.toString()}
              onChange={(e) => handleSelectChange(e, "status")}
              sx={{ minWidth: isMobile ? 'auto' : 120 }}
              size="small"
              fullWidth
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.label} value={option.value.toString()}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        ) : (
          <>
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password || ''}
              onChange={handleChange}
              sx={{ minWidth: isMobile ? 'auto' : 120 }}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Status"
              name="status"
              value={form.status.toString()}
              onChange={(e) => handleSelectChange(e, "status")}
              sx={{
                minWidth: isMobile ? 'auto' : 120
              }}
              size="small"
              fullWidth
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.label} value={option.value.toString()}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        )}
      </Box>
    );

    switch (activeTab) {
      case 'Student':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: isMobile ? 1.5 : 2
            }}>
              <TextField
                select
                label="Grade"
                name="grade"
                value={form.grade || ''}
                onChange={(e) => handleSelectChange(e, "grade")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                disabled={isLoadingGrades}
                fullWidth
              >
                {grades.map((grade) => (
                  <MenuItem key={grade.id} value={grade.grade}>
                    {grade.grade}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Medium"
                name="medium"
                value={form.medium || ''}
                onChange={(e) => handleSelectChange(e, "medium")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              >
                {mediumOptions.map((medium: string) => (
                  <MenuItem key={medium} value={medium}>
                    {medium}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Student Admission No"
                name="studentAdmissionNo"
                value={form.studentAdmissionNo || ''}
                onChange={handleChange}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              />
              <TextField
                select
                label="Class"
                name="class"
                value={form.class || ''}
                onChange={(e) => handleSelectChange(e, "class")}
                fullWidth
                size="small"
                disabled={isLoadingClasses}
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.class}>
                    {cls.class}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        );
      case 'Teacher':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}

            <TextField
              label="Staff Number"
              name="staffNo"
              value={form.staffNo || ''}
              onChange={handleChange}
              fullWidth
              size="small"
            />

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: isMobile ? 1.5 : 2
            }}>
              <TextField
                select
                label="Grade"
                name="grade"
                value={form.grade || ''}
                onChange={(e) => handleSelectChange(e, "grade")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                disabled={isLoadingGrades}
                fullWidth
              >
                {grades.map((grade) => (
                  <MenuItem key={grade.id} value={grade.grade}>
                    {grade.grade}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Class"
                name="class"
                value={form.class || ''}
                onChange={(e) => handleSelectChange(e, "class")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                disabled={isLoadingClasses}
                fullWidth
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.class}>
                    {cls.class}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Subject"
                name="subject"
                value={form.subject || ''}
                onChange={(e) => handleSelectChange(e, "subject")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                disabled={isLoadingSubjects}
                fullWidth
              >
                {(subjects || []).slice().sort((a, b) =>
                  (a.mainSubject || '').localeCompare(b.mainSubject || '')
                ).map((subject: Subject) => (
                  <MenuItem key={subject.id} value={subject.mainSubject}>
                    {subject.mainSubject}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Medium"
                name="medium"
                value={form.medium || ''}
                onChange={(e) => handleSelectChange(e, "medium")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              >
                {mediumOptions.map(med => (
                  <MenuItem key={med} value={med}>{med}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Button
              variant="contained"
              onClick={handleAddAssignment}
              startIcon={<Add />}
              sx={{ maxWidth: 200 }}
            >
              Add to list
            </Button>

            {teacherAssignments.length > 0 && (
              <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <MuiTable size={isMobile ? "small" : "medium"} sx={{ minWidth: isMobile ? '100%' : 'auto' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: isMobile ? theme.palette.action.hover : 'inherit' }}>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Grade</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Class</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Subject</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Medium</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherAssignments.map((assignment) => (
                      <TableRow key={assignment.id} sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{assignment.teacherGrade}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{assignment.teacherClass}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{assignment.subject}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{assignment.medium}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>
                          <IconButton
                            onClick={() => {
                              setTeacherAssignments(prev =>
                                prev.filter(a => a.id !== assignment.id)
                              );
                            }}
                            size={isMobile ? "small" : "medium"}
                          >
                            <DeleteRowIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            )}
          </Box>
        );
      case 'Parent':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: isMobile ? 1.5 : 2
            }}>
              <TextField
                label="Profession"
                name="profession"
                value={form.profession || ''}
                onChange={handleChange}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              />
              <TextField
                select
                label="Relation"
                name="relation"
                value={form.relation || ''}
                onChange={(e) => handleSelectChange(e, "relation")}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              >
                {relationOptions.map((relation: string) => (
                  <MenuItem key={relation} value={relation}>
                    {relation}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Parent Contact"
                name="parentContact"
                value={form.parentContact || ''}
                onChange={handleChange}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              />
              <TextField
                label="Student Admission No"
                name="studentAdmissionNo"
                value={form.studentAdmissionNo || ''}
                onChange={handleChange}
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
                size="small"
                fullWidth
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleAddParent}
              startIcon={<Add />}
              sx={{ maxWidth: 200 }}
            >
              Add to list
            </Button>

            {parentEntries.length > 0 && (
              <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                <MuiTable size={isMobile ? "small" : "medium"} sx={{ minWidth: isMobile ? '100%' : 'auto' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: isMobile ? theme.palette.action.hover : 'inherit' }}>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Relation</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Profession</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Parent Contact</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Admission No</TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px', fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parentEntries.map((p) => (
                      <TableRow key={p.id} sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{p.relation}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{p.profession}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{p.parentContact}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>{p.studentAdmissionNo}</TableCell>
                        <TableCell sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem', padding: isMobile ? '6px 4px' : '8px 16px' }}>
                          <IconButton
                            onClick={() => setParentEntries(prev => prev.filter(x => x.id !== p.id))}
                            size={isMobile ? "small" : "medium"}
                          >
                            <DeleteRowIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            )}
          </Box>
        );
      case 'ManagementStaff':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}

            
          </Box>
        );
      default:
        return commonFields;
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", width: '90%' }}>
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
            title="User Management"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Stack spacing={isMobile ? 1.5 : 3} sx={{ p: isMobile ? 1.5 : 3, overflow: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <Paper ref={formTopRef} sx={{ p: isMobile ? 1.5 : 3, borderRadius: 2, width: '100%', boxSizing: 'border-box' }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: theme.palette.primary.main, fontWeight: 600 }}>
              {editId !== null ? "Edit User" : "Create New User"}
            </Typography>

            <Stack spacing={2}>
              {renderFormFields()}

              <Stack direction={isMobile ? "column" : "row"} spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isMutating}
                  startIcon={isMutating ? <CircularProgress size={20} /> : null}
                  fullWidth={isMobile}
                >
                  {editId !== null ? "Update User" : "Create User"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  disabled={isMutating}
                  fullWidth={isMobile}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Paper>

         <Paper sx={{ 
            p: isMobile ? 1 : 2, 
            borderRadius: 2, 
            height: isMobile ? 500 : 720, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <Stack spacing={2}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant={isMobile ? "fullWidth" : "standard"}
                  scrollButtons={isMobile ? "auto" : false}
                  allowScrollButtonsMobile
                >
                  <Tab label="Students" value="Student" />
                  <Tab label="Teachers" value="Teacher" />
                  <Tab label="Parents" value="Parent" />
                  <Tab label="ManagementStaff" value="ManagementStaff" />
                </Tabs>
              </Box>

              <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"} justifyContent="space-between">
                <TextField
                  placeholder={`Search ${activeTab.toLowerCase()}s...`}
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth={isMobile}
                  sx={{
                    width: isMobile ? '100%' : 300,
                    '& .MuiOutlinedInput-root': {
                      pr: 1,
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Stack>
            </Stack>

            <Box sx={{ 
              flexGrow: 1, 
              mt: 2, 
              overflow: 'hidden', 
              width: '100%', 
              maxWidth: '100%',
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              <DataGrid
                rows={displayData}
                columns={columns}
                loading={Boolean(isDataLoading || isMutating || (searchTerm && isSearching))}
                slots={{ toolbar: CustomToolbar }}
                checkboxSelection
                disableRowSelectionOnClick
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={(newSelection) => setRowSelectionModel([...newSelection])}
                pageSizeOptions={[5, 10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: isMobile ? 5 : 10, page: 0 },
                  },
                }}
                rowHeight={isMobile ? 48 : 52}
                sx={{
                  border: 'none',
                  height: '100%',
                  minHeight: isMobile ? 360 : '100%',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  '& .MuiDataGrid-root': {
                    overflow: 'auto',
                    maxWidth: '100%'
                  },
                  '& .MuiDataGrid-main': {
                    overflow: 'auto',
                    maxWidth: '100%'
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontSize: isMobile ? '0.78rem' : '0.875rem',
                    padding: isMobile ? '6px 8px' : '8px 16px',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontSize: isMobile ? '0.78rem' : '0.875rem',
                  },
                  '& .MuiDataGrid-toolbarContainer': {
                    padding: theme.spacing(1),
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                  '& .MuiDataGrid-virtualScroller': {
                    overflow: 'auto !important',
                    maxWidth: '100%',
                    '&::-webkit-scrollbar': {
                      width: '10px',
                      height: '10px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                  },
                  '& .MuiDataGrid-scrollbar': {
                    '&::-webkit-scrollbar': {
                      width: '10px',
                      height: '10px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                  },
                  '& .MuiDataGrid-columnHeader': {
                    padding: isMobile ? '6px 8px' : '8px 16px',
                  },
                  '& .MuiDataGrid-row': {
                    minHeight: isMobile ? '48px !important' : '52px !important',
                  },
                }}
                ref={dataGridRef}
              />
            </Box>
          </Paper>
        </Stack>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default UserManagement;

const processImage = async (file: File): Promise<string | null> => {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size should be less than 5MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        if (base64String.length > 250000) {
          reject(new Error('Image is too large. Please choose a smaller image.'));
          return;
        }

        resolve(base64String);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Normalize various backend shapes into an array of ParentEntry
const normalizeParentEntries = (rawUser: any): ParentEntry[] => {
  const rawParentArray =
    rawUser?.parentEntries ??
    rawUser?.parentData ??
    rawUser?.parent ??
    rawUser?.parent_data ??
    rawUser?.parent_info ??
    [];

  const arr = Array.isArray(rawParentArray) ? rawParentArray : (rawParentArray ? [rawParentArray] : []);

  const normalized: ParentEntry[] = arr.flatMap((item: any) => {
    // shape: { parent_info: {...}, students_info: [...] }
    if (item?.parent_info && Array.isArray(item?.students_info)) {
      return item.students_info.map((student: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        relation: item.parent_info.relation || '',
        profession: item.parent_info.profession || '',
        parentContact: item.parent_info.parent_contact || item.parent_info.parentContact || '',
        studentAdmissionNo: student.studentAdmissionNo || student.student_admission_no || ''
      }));
    }

    // shape: { relation, profession, parentContact, studentAdmissionNo }
    if (item?.relation || item?.profession || item?.parentContact || item?.studentAdmissionNo) {
      return {
        id: item.id ? String(item.id) : Math.random().toString(36).substr(2, 9),
        relation: item.relation || item.parent_info?.relation || '',
        profession: item.profession || item.parent_info?.profession || '',
        parentContact: item.parentContact || item.parent_contact || item.parent_info?.parent_contact || '',
        studentAdmissionNo: item.studentAdmissionNo || item.student_admission_no || ''
      };
    }

    // fallback single-level mapping (sometimes backend returns { parent_info: {...} })
    if (item?.parent_info) {
      const pi = item.parent_info;
      return {
        id: Math.random().toString(36).substr(2, 9),
        relation: pi.relation || '',
        profession: pi.profession || '',
        parentContact: pi.parent_contact || pi.parentContact || '',
        studentAdmissionNo: (item.students_info && item.students_info[0]?.studentAdmissionNo) || ''
      };
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      relation: '',
      profession: '',
      parentContact: '',
      studentAdmissionNo: ''
    };
  });

  return normalized;
};

// Helper: ensure we get staff entries as an array
const normalizeStaffEntries = (rawUser: any): StaffEntry[] => {
  const rawStaffArray =
    rawUser?.staffEntries ??
    rawUser?.staffData ??
    rawUser?.staff ??
    rawUser?.staff_data ??
    rawUser?.staff_info ??
    [];

  const arr = Array.isArray(rawStaffArray) ? rawStaffArray : (rawStaffArray ? [rawStaffArray] : []);

  const normalized: StaffEntry[] = arr.flatMap((item: any) => {
    // shape: { designation, department, staffContact, staffId }
    if (item?.designation || item?.department || item?.staffContact || item?.staffId) {
      return {
        id: item.id ? String(item.id) : Math.random().toString(36).substr(2, 9),
        designation: item.designation || item.staff_info?.designation || '',
        department: item.department || item.staff_info?.department || '',
        staffContact: item.staffContact || item.staff_contact || item.staff_info?.staff_contact || '',
        staffId: item.staffId || item.staff_id || item.staff_info?.staff_id || ''
      };
    }

    // fallback single-level mapping
    if (item?.staff_info) {
      const si = item.staff_info;
      return {
        id: Math.random().toString(36).substr(2, 9),
        designation: si.designation || '',
        department: si.department || '',
        staffContact: si.staff_contact || si.staffContact || '',
        staffId: si.staff_id || si.staffId || ''
      };
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      designation: '',
      department: '',
      staffContact: '',
      staffId: ''
    };
  });

  return normalized;
};

// Helper: ensure we get staff entries as an array for export (tries normalizeStaffEntries first,
// falls back to splitting comma-joined fields if needed).
const getStaffEntriesForExport = (user: any): StaffEntry[] => {
  const normalized = normalizeStaffEntries(user);
  if (normalized && normalized.length > 0) return normalized;

  // fallback: attempt to split comma-joined grid strings
  const designations = (user.designation || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const departments = (user.department || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const staffContacts = (user.staffContact || user.contact || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const staffIds = (user.staffId || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);

  const max = Math.max(designations.length, departments.length, staffContacts.length, staffIds.length, 1);
  const entries: StaffEntry[] = [];
  for (let i = 0; i < max; i++) {
    entries.push({
      id: `${user.id || 'u'}-${i}`,
      designation: designations[i] || '',
      department: departments[i] || '',
      staffContact: staffContacts[i] || '',
      staffId: staffIds[i] || ''
    });
  }
  return entries;
};

// Helper: ensure we get parent entries as an array for export (tries normalizeParentEntries first,
// falls back to splitting comma-joined fields if needed).
const getParentEntriesForExport = (user: any): ParentEntry[] => {
  const normalized = normalizeParentEntries(user);
  if (normalized && normalized.length > 0) return normalized;

  // fallback: attempt to split comma-joined grid strings
  const relations = (user.relation || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const professions = (user.profession || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const parentContacts = (user.parentContact || user.contact || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const admissionNos = (user.studentAdmissionNo || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);

  const max = Math.max(relations.length, professions.length, parentContacts.length, admissionNos.length, 1);
  const entries: ParentEntry[] = [];
  for (let i = 0; i < max; i++) {
    entries.push({
      id: `${user.id || 'u'}-${i}`,
      relation: relations[i] || '',
      profession: professions[i] || '',
      parentContact: parentContacts[i] || '',
      studentAdmissionNo: admissionNos[i] || ''
    });
  }
  return entries;
};

// Helper: ensure we get a list of teacher assignments (teacherData preferred, otherwise split joined strings)
const getTeacherAssignmentsForExport = (user: any) => {
  // if UI/fetch already returned teacherData (normalized array), use it
  if (Array.isArray(user.teacherData) && user.teacherData.length > 0) {
    return user.teacherData.map((t: any, i: number) => ({
      id: `${user.id || 'u'}-t-${i}`,
      teacherGrade: t.teacherGrade || t.grade || '',
      teacherClass: Array.isArray(t.teacherClass) ? t.teacherClass.join(', ') : (t.teacherClass || t.class || ''),
      subject: Array.isArray(t.subject) ? t.subject.join(', ') : (t.subject || ''),
      medium: Array.isArray(t.medium) ? t.medium.join(', ') : (t.medium || '')
    }));
  }

  // fallback: split comma-joined grid fields (grade/class/subject/medium)
  const grades = (user.grade || user.class || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const classes = (user.class || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const subjects = (user.subject || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
  const mediums = (user.medium || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean);

  const max = Math.max(grades.length, classes.length, subjects.length, mediums.length, 1);
  const assignments = [];
  for (let i = 0; i < max; i++) {
    assignments.push({
      id: `${user.id || 'u'}-t-${i}`,
      teacherGrade: grades[i] || '',
      teacherClass: classes[i] || '',
      subject: subjects[i] || '',
      medium: mediums[i] || ''
    });
  }
  return assignments;
};


