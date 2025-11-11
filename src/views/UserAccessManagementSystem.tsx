import { useState, useEffect } from "react";
import {
    Box, Button, Checkbox, CircularProgress, FormControlLabel,
    MenuItem, Select, Typography, type SelectChangeEvent,
    AppBar, Snackbar, Alert, Paper, CssBaseline, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery
} from "@mui/material";
import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { useTheme } from "@mui/material/styles";
import {
    fetchUserRoles,
    createUserRole,
    updateUserRole,
    deleteUserRole,
    type UserRole,
    type PermissionKey
} from "../api/userAccessmanagementApi";
import { Stack } from "@mui/system";

const defaultPermissions: Record<PermissionKey, boolean> = {
    // Admin Panel
    dashboard: false,
    studentDashboard: false,
    teacherDashboard: false,
    commonDashboard: false,

    //Add marks 
    addMarks: false,
    addClassTeacher: false,
    addStudent: false,
    //Reports
    reports: false,
    managementStaffReport: false,
    classTeacherReport: false,
    parentReport: false,
    parentTeacherReport: false,
    parentPrincipalReport: false,
    // User Management
    userManagementSub: false,
    userManagement: false,
    userAccessManagement: false,

    marksChecking: false,

    // System Management
    systemManagement: false,

    // User Profile
    userProfile: false,
    help: false,
    
    // Other Settings
    autoRefresh: false,
};

const UserAccessManagementSystem = () => {
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [roleDescription, setRoleDescription] = useState<string>("");
    const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(defaultPermissions);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const theme = useTheme();
    useCustomTheme();

    // Responsive breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error"
    });

    type NewRoleForm = {
        userType: string;
        description: string;
    };

    const [newRoleDialog, setNewRoleDialog] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState<NewRoleForm>({
        userType: '',
        description: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const arrayToPermissionsObject = (arr: string[] | undefined): Record<PermissionKey, boolean> => {
        const obj = { ...defaultPermissions };
        if (Array.isArray(arr)) {
            arr.forEach(key => {
                if (key in obj) obj[key as PermissionKey] = true;
            });
        }
        return obj;
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedRoles = await fetchUserRoles();
            setRoles(fetchedRoles || []);
            if (fetchedRoles && fetchedRoles.length > 0) {
                const firstRole = fetchedRoles[0];
                setSelectedRole(String(firstRole.userType));
                setSelectedRoleId(firstRole.id);
                setRoleDescription(firstRole.description);
                setPermissions(arrayToPermissionsObject(firstRole.permissionObject));
            }
        } catch (err) {
            setError('An error occurred while loading data');
            showSnackbar('An error occurred while loading data', "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const role = roles.find(r => r.userType === selectedRole);
        if (role) {
            setSelectedRoleId(role.id);
            setRoleDescription(role.description);
            setPermissions(arrayToPermissionsObject(role.permissionObject));
        }
    }, [selectedRole, roles]);

    const handlePermissionChange = (key: PermissionKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setPermissions(prev => ({ ...prev, [key]: e.target.checked }));
    };

    const handleParentPermissionChange = (parentKey: PermissionKey, childKeys: PermissionKey[]) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setPermissions(prev => {
            const newPermissions = { ...prev, [parentKey]: isChecked };
            childKeys.forEach(childKey => {
                newPermissions[childKey] = isChecked;
            });
            return newPermissions;
        });
    };

    const showSnackbar = (message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
    };

    const handleRoleChange = (e: SelectChangeEvent<string>) => {
        setSelectedRole(e.target.value);
    };

    const getSelectedPermissions = () =>
        Object.entries(permissions)
            .filter(([_, value]) => value)
            .map(([key]) => key as PermissionKey);

    const handleUpdate = async () => {
        if (!selectedRoleId || !selectedRole) return;
        setLoading(true);
        try {
            await updateUserRole(selectedRoleId, {
                userType: selectedRole,
                description: roleDescription,
                permissionObject: getSelectedPermissions(),
            });
            await loadData();
            showSnackbar("Role updated successfully!", "success");
        } catch {
            showSnackbar("Failed to update role", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setNewRoleForm({ userType: '', description: '' });
        setNewRoleDialog(true);
    };

    const handleCreateRole = async () => {
        if (!newRoleForm.userType || !newRoleForm.description) {
            showSnackbar("Please fill all fields", "error");
            return;
        }
        setLoading(true);
        try {
            const newRole = await createUserRole({
                userType: newRoleForm.userType,
                description: newRoleForm.description,
                permissionObject: getSelectedPermissions(),
            });
            await loadData();
            setSelectedRole(String(newRole.userType));
            showSnackbar("New role created successfully!", "success");
            setNewRoleDialog(false);
        } catch {
            showSnackbar("Failed to create role", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRoleId || !window.confirm("Are you sure you want to delete this role?")) return;
        setLoading(true);
        try {
            await deleteUserRole(selectedRoleId);
            await loadData();
            showSnackbar("Role deleted successfully!", "success");
        } catch {
            showSnackbar("Failed to delete role", "error");
        } finally {
            setLoading(false);
        }
    };

    const renderCheckbox = (key: PermissionKey, label: string, bold: boolean = false, indented: boolean = false) => (
        <FormControlLabel
            key={key}
            control={
                <Checkbox
                    checked={permissions ? permissions[key] || false : false}
                    onChange={handlePermissionChange(key)}
                    disabled={loading}
                    size={isMobile ? "small" : "medium"}
                />
            }
            label={
                <Typography 
                    variant={isMobile ? "body2" : "body1"} 
                    sx={{ fontWeight: bold ? 'bold' : 'normal' }}
                >
                    {label}
                </Typography>
            }
            sx={{
                ml: indented ? (isMobile ? 2 : 4) : (isMobile ? 1 : 2),
                width: '100%',
                '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.813rem' : '0.875rem',
                    color: theme.palette.text.secondary
                }
            }}
        />
    );

    const renderParentCheckbox = (
        parentKey: PermissionKey,
        parentLabel: string,
        childKeys: PermissionKey[],
        childLabels: string[]
    ) => (
        <Box key={parentKey} sx={{ mb: 1, width: '100%' }}>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={permissions ? permissions[parentKey] || false : false}
                        onChange={handleParentPermissionChange(parentKey, childKeys)}
                        disabled={loading}
                        size={isMobile ? "small" : "medium"}
                    />
                }
                label={
                    <Typography 
                        variant={isMobile ? "body2" : "subtitle1"} 
                        sx={{ fontWeight: 'bold' }}
                    >
                        {parentLabel}
                    </Typography>
                }
                sx={{ ml: isMobile ? 1 : 2 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', ml: isMobile ? 1 : 2 }}>
                {childKeys.map((childKey, index) =>
                    renderCheckbox(childKey, childLabels[index], false, true)
                )}
            </Box>
        </Box>
    );

    const renderPermissionSection = (title: string, content: React.ReactNode) => (
        <Stack spacing={isMobile ? 2 : 3} sx={{ p: isMobile ? 2 : 3, overflow: 'auto' }}>
            <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                sx={{
                    fontWeight: "bold",
                    mb: isMobile ? 1 : 2,
                    color: theme.palette.primary.main,
                    pl: isMobile ? 1 : 2
                }}
            >
                {title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {content}
            </Box>
        </Stack>
    );

    return (
        <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh" }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: 'hidden' }}>
                <AppBar position="static" sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary
                }}>
                    <Navbar title="User Access Management" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                </AppBar>

                {error && (
                    <Alert severity="error" sx={{ m: isMobile ? 1 : 2 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ 
                        p: isMobile ? 1.5 : isTablet ? 2 : 3,
                        overflow: 'auto',
                        height: '100%'
                    }}>
                        <Paper elevation={3} sx={{ 
                            p: isMobile ? 2 : 3, 
                            mb: isMobile ? 2 : 3, 
                            borderRadius: 2 
                        }}>
                            <Box sx={{ 
                                display: "flex", 
                                flexDirection: isMobile ? "column" : "row",
                                gap: 2, 
                                flexWrap: "wrap", 
                                alignItems: isMobile ? "stretch" : "center" 
                            }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: isMobile ? 'stretch' : 'center',
                                    gap: isMobile ? 1 : 2,
                                    width: isMobile ? '100%' : 'auto'
                                }}>
                                    <Typography sx={{ 
                                        fontSize: isMobile ? '0.875rem' : '1rem',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        User Role:
                                    </Typography>
                                    <Select
                                        value={selectedRole}
                                        onChange={handleRoleChange}
                                        sx={{ 
                                            minWidth: isMobile ? '100%' : 200,
                                            fontSize: isMobile ? '0.875rem' : '1rem'
                                        }}
                                        disabled={loading || roles.length === 0}
                                        size={isMobile ? "small" : "medium"}
                                    >
                                        {roles.map(role => (
                                            <MenuItem key={role.id} value={role.userType}>{role.userType}</MenuItem>
                                        ))}
                                    </Select>
                                </Box>

                                <Box sx={{ 
                                    display: "flex", 
                                    flexDirection: isMobile ? "column" : "row",
                                    gap: isMobile ? 1.5 : 2, 
                                    ml: isMobile ? 0 : "auto",
                                    width: isMobile ? '100%' : 'auto'
                                }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleUpdate}
                                        disabled={loading || !selectedRoleId}
                                        fullWidth={isMobile}
                                        size={isMobile ? "small" : "medium"}
                                    >
                                        {loading ? <CircularProgress size={20} /> : "Update"}
                                    </Button>
                                    <Button 
                                        variant="contained" 
                                        color="secondary" 
                                        onClick={handleNew} 
                                        disabled={loading}
                                        fullWidth={isMobile}
                                        size={isMobile ? "small" : "medium"}
                                    >
                                        New
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={handleDelete}
                                        disabled={loading || !selectedRoleId}
                                        fullWidth={isMobile}
                                        size={isMobile ? "small" : "medium"}
                                    >
                                        Delete
                                    </Button>
                                </Box>
                            </Box>

                            <TextField
                                fullWidth
                                label="Role Description"
                                value={roleDescription}
                                onChange={(e) => setRoleDescription(e.target.value)}
                                sx={{ mt: isMobile ? 2 : 3 }}
                                disabled={loading}
                                size={isMobile ? "small" : "medium"}
                                multiline={isMobile}
                                rows={isMobile ? 2 : 1}
                            />
                        </Paper>

                        <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
                            <Typography 
                                variant={isMobile ? "h6" : "h5"} 
                                sx={{ mb: isMobile ? 2 : 3 }}
                            >
                                Role Permissions
                            </Typography>
                            
                            <Box sx={{ 
                                display: 'flex',
                                flexDirection: isTablet ? 'column' : 'row',
                                gap: isMobile ? 2 : 3
                            }}>
                                <Box sx={{ flex: 1 }}>
                                    {renderPermissionSection("Admin Panel", (
                                        <>
                                            {renderParentCheckbox(
                                                "dashboard",
                                                "Dashboard",
                                                ["studentDashboard", "teacherDashboard", "commonDashboard"],
                                                ["Student Dashboard", "Teacher Dashboard", "Common Dashboard"]
                                            )}

                                            {renderCheckbox("addMarks", "Add Marks", true)}

                                            {renderCheckbox("addClassTeacher", "Add Class Teacher", true)}

                                            {renderCheckbox("addStudent", "Add Student", true)}

                                            {renderCheckbox("marksChecking", "Marks Checking", true)}

                                            {renderParentCheckbox(
                                                "userManagement",
                                                "User Management",
                                                ["userManagementSub", "userAccessManagement"],
                                                ["User Management", "User Access Management"]
                                            )}

                                            {renderParentCheckbox(
                                                "reports",
                                                "Reports",
                                                ["managementStaffReport", "classTeacherReport", "parentReport", "parentPrincipalReport", "parentTeacherReport"],
                                                ["Management Staff Report", "Class Teacher Report", "Parent Report", "Student Report For Principal", "Student Report For Teacher"],
                                            )}

                                            {renderCheckbox("systemManagement", "System Management", true)}
                                            {renderCheckbox("userProfile", "User profile", true)}
                                            {renderCheckbox("help", "Help", true)}
                                        </>
                                    ))}
                                </Box>

                                <Box sx={{ flex: 1 }}>
                                    {renderPermissionSection("Other Settings", (
                                        <>
                                            {renderCheckbox("autoRefresh", "Auto Refresh Dashboard", true)}
                                        </>
                                    ))}
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                )}

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ 
                        vertical: isMobile ? 'bottom' : 'top', 
                        horizontal: 'center' 
                    }}
                >
                    <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
                </Snackbar>

                <Dialog
                    open={newRoleDialog}
                    onClose={() => setNewRoleDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    fullScreen={isMobile}
                >
                    <DialogTitle sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                        Create New Role
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Role Name"
                                value={newRoleForm.userType}
                                onChange={(e) => setNewRoleForm(prev => ({ ...prev, userType: e.target.value }))}
                                disabled={loading}
                                size={isMobile ? "small" : "medium"}
                            />
                            <TextField
                                fullWidth
                                label="Description"
                                value={newRoleForm.description}
                                onChange={(e) => setNewRoleForm(prev => ({ ...prev, description: e.target.value }))}
                                disabled={loading}
                                multiline
                                minRows={isMobile ? 3 : 2}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 1 : 0,
                        p: isMobile ? 2 : 1
                    }}>
                        <Button
                            onClick={() => setNewRoleDialog(false)}
                            disabled={loading}
                            fullWidth={isMobile}
                            size={isMobile ? "small" : "medium"}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRole}
                            variant="contained"
                            disabled={loading}
                            fullWidth={isMobile}
                            size={isMobile ? "small" : "medium"}
                        >
                            {loading ? <CircularProgress size={20} /> : "Create"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Box>
    );
};

export default UserAccessManagementSystem;