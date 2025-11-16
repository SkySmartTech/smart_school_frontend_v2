import { useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  styled,
  Toolbar,
  Box,
  Avatar,
} from "@mui/material";
import {
  Layers,
  Settings,
  ExitToApp,
  ExpandLess,
  ExpandMore,
  NoteAdd as NoteAddIcon,
  SubdirectoryArrowRight,
  SupervisedUserCircle,
  SupervisedUserCircleTwoTone,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";
import { useSnackbar } from "notistack";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '../hooks/usePermissions';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const drawerWidth = 240;
const collapsedWidth = 60;

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    enqueueSnackbar("You have been logged out", { variant: "info" });
    navigate("/login", { replace: true });
  };


  const StyledListItemIcon = styled(ListItemIcon)({
    minWidth: 0,
    justifyContent: "center",
    color: mode === 'dark' ? "#ffffff" : "#000000",
    marginRight: "auto",
  });

  const sidebarItems = [
    { type: "headline", text: "Main" },
    { type: "headline", text: "Administration" },
    {
      type: "nested",
      title: "Dashboard",
      icon: <Layers fontSize="small" />,
      permission: "dashboard",
      children: [
        {
          title: "Student Dashboard",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/studentdashboard",
          permission: "studentDashboard"
        },
        {
          title: "Teacher Dashboard",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/teacherdashboard",
          permission: "teacherDashboard"
        },
        {
          title: "Common Dashboard",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/dashboard",
          permission: "commonDashboard"
        },
      ],
    },
    {
      type: "nested",
      title: "Academic ",
      icon: <NoteAddIcon fontSize="small" />,
      children: [
        {
          title: "Add Marks",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/addmarks",
          permission: "addMarks"
        },
        {
          title: "Add Class Teacher",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/addClassTeacher",
          permission: "addClassTeacher"
        },
        {
          title: "Add Student",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/addStudent",
          permission: "addStudent"
        },
        {
          title: "Marks Checking",
          icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/marksChecking",
          permission: "marksChecking"
        },
      ],
    },
    {
      type: "divider"
    },
    { type: "headline", text: "Configuration" },
    {
      type: "nested",
      title: "User Management",
      icon: <SupervisedUserCircleTwoTone fontSize="small" />,
      children: [
        {
          title: "User Management", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/userManagement", permission: "userManagement"
        },
        {
          title: "User Access Management", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/userAccessManagement", permission: "userAccessManagement"
        },
      ],
    },
    {
      type: "nested",
      title: "Reports",
      icon: <SupervisedUserCircleTwoTone fontSize="small" />,
      children: [
        {
          title: "Management Staff Report", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/managementStaffReport", permission: "managementStaffReport"
        },
        {
          title: "Class Teacher Report", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/classTeacherReport", permission: "classTeacherReport"
        },
        {
          title: "Parent Report", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/parentReport", permission: "parentReport"
        },
        {
          title: "Student Report For Teacher", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/parentTeacherReport", permission: "parentTeacherReport"
        },
        {
          title: "Student Report For Principal", icon: <SubdirectoryArrowRight fontSize="small" />,
          href: "/parentPrincipalReport", permission: "parentPrincipalReport"
        },
      ],
    },
    {
      type: "item",
      title: "System Management",
      icon: <Settings fontSize="small" />,
      permission: "systemManagement",


      href: "/systemManagement",
    },
    { type: "divider" },
    { type: "headline", text: "Components" },
    {
      type: "item",
      title: "User Profile",
      icon: <Settings fontSize="small" />,
      permission: "userProfile",
      href: "/userProfile",
    },
    {
      type: "item",
      title: "Help",
      icon: <SupervisedUserCircle fontSize="small" />,
      permission: "help",
      href: "/help",
    },
    {
      type: "item",
      title: "Settings",
      icon: <Settings fontSize="small" />,
      permission: "settings",
      href: "/sample",
    },
    {
      type: "item",
      title: "Logout",
      icon: <ExitToApp fontSize="small" />,
      action: handleLogout,
    },
  ];

  const handleItemClick = (item: any) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
    setOpen(false);
  };

  const renderMenuItem = (item: any) => {
    // If the item requires permission and user doesn't have it, don't render
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    // For nested items, check both parent and child permissions
    if (item.type === "nested") {
      const validChildren = item.children.filter(
        (child: any) => !child.permission || hasPermission(child.permission)
      );

      // If no valid children, don't render the parent
      if (validChildren.length === 0) {
        return null;
      }

      // Update children to only include valid ones
      return {
        ...item,
        children: validChildren,
      };
    }

    return item;
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          backgroundColor: mode === 'dark' ? "#1e1e1e" : "#ffffff",
          color: mode === 'dark' ? "#ffffff" : "#000000",
          transition: theme => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflowX: 'hidden',
          borderRight: 'none',
          zIndex: theme => theme.zIndex.drawer, // Add this
          height: '100%',
        },
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Toolbar /> {/* This creates space for the fixed navbar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: open ? 2 : 1,
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          mb: 2,
          height: 'auto',
          minHeight: open ? 100 : 60
        }}
      >
        <Avatar
          src="/images/schoolLogo.png"
          alt="Company Logo"
          sx={{
            width: open ? 80 : 40,
            height: open ? 80 : 40,
            transition: 'all 0.3s ease',
          }}
        />
      </Box>

      <List sx={{ p: 0 }}>
        {sidebarItems
          .map(renderMenuItem)
          .filter(Boolean)
          .map((item, index) => {
            if (item.type === "headline") {
              return (
                <ListItemText
                  key={index}
                  primary={item.text}
                  sx={{
                    px: 2.5,
                    py: 1,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "text.secondary",
                    display: open ? "block" : "none",
                  }}
                />
              );
            }

            if (item.type === "divider") {
              return (
                <Divider
                  key={index}
                  sx={{
                    my: 1,
                    backgroundColor: mode === 'dark' ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                    display: open ? "block" : "none",
                  }}
                />
              );
            }

            if (item.type === "nested") {
              return (
                <div key={index}>
                  <ListItemButton
                    onClick={() => toggleSection(item.title!)}
                    sx={{
                      minHeight: 48,
                      px: 2.5,
                      "&:hover": {
                        backgroundColor: mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                      }
                    }}
                  >
                    <StyledListItemIcon>{item.icon}</StyledListItemIcon>
                    {open && (
                      <>
                        <ListItemText
                          primary={item.title}
                          primaryTypographyProps={{
                            fontSize: "0.875rem",
                            color: mode === 'dark' ? "#ffffff" : "#000000"
                          }}
                        />
                        {openSections[item.title!] ? (
                          <ExpandLess fontSize="small" />
                        ) : (
                          <ExpandMore fontSize="small" />
                        )}
                      </>
                    )}
                  </ListItemButton>

                  <Collapse in={openSections[item.title!] && open} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 2 }}>
                      {item.children?.map((child: { icon: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; title: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, childIndex: Key | null | undefined) => (
                        <ListItemButton
                          key={childIndex}
                          onClick={() => handleItemClick(child)}
                          sx={{
                            pl: 4,
                            minHeight: 48,
                            "&:hover": {
                              backgroundColor: mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                            }
                          }}
                        >
                          <StyledListItemIcon>{child.icon}</StyledListItemIcon>
                          {open && (
                            <ListItemText
                              primary={child.title}
                              primaryTypographyProps={{
                                fontSize: "0.875rem",
                                color: mode === 'dark' ? "#ffffff" : "#000000"
                              }}
                            />
                          )}
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                </div>
              );
            }

            return (
              <ListItemButton
                key={index}
                onClick={() => handleItemClick(item)}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&:hover": {
                    backgroundColor: mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                  }
                }}
              >
                <StyledListItemIcon>{item.icon}</StyledListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      color: mode === 'dark' ? "#ffffff" : "#000000"
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
      </List>
    </Drawer>
  );
};

export default Sidebar;