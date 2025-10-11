import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, CssBaseline, IconButton, Divider, Avatar, Menu, 
  MenuItem, Badge, Tooltip
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  AccountTree as ProjectsIcon, 
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const drawerWidth = 260;

const navItems = [
  { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { text: 'Projets', path: '/projects', icon: <ProjectsIcon /> },
];

const settingsNavItems = [
    { text: 'Paramètres', path: '/settings', icon: <SettingsIcon /> },
]

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  '&.Mui-selected': {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const Layout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const getPageTitle = () => {
    const allNavItems = [...navItems, ...settingsNavItems];
    const currentNavItem = allNavItems.find(item => location.pathname.startsWith(item.path));
    if (currentNavItem) return currentNavItem.text;
    if (location.pathname.includes('/projects/')) return 'Détail du Projet';
    return 'Projexolve';
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          PROJEXOLVE
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ display: { sm: 'none' } }}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, p: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <StyledListItemButton component={NavLink} to={item.path} selected={location.pathname.startsWith(item.path)}>
              <ListItemIcon sx={{minWidth: 40}}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </StyledListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List sx={{ p: 1 }}>
        {settingsNavItems.map((item) => (
            <ListItem key={item.text} disablePadding>
                <StyledListItemButton component={NavLink} to={item.path} selected={location.pathname.startsWith(item.path)}>
                    <ListItemIcon sx={{minWidth: 40}}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                </StyledListItemButton>
            </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            {getPageTitle()}
          </Typography>
          
          <Tooltip title="Notifications">
            <IconButton color="inherit" sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={0} color="error"> 
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Mon compte">
            <IconButton
              onClick={handleMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.email?.[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      <Menu
        anchorEl={anchorEl}
        id="primary-search-account-menu"
        open={isMenuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{user?.email}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem><ListItemIcon><PersonIcon fontSize="small"/></ListItemIcon>Profil</MenuItem>
        <MenuItem onClick={signOut}><ListItemIcon><LogoutIcon fontSize="small"/></ListItemIcon>Déconnexion</MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;