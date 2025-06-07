import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          CSU BIOLab System
        </Typography>
        {isAuthenticated ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {user?.role === 'admin' && (
              <Button color="inherit" onClick={() => navigate('/admin')}>
                Admin Dashboard
              </Button>
            )}
            {user?.role === 'student' && (
              <Button color="inherit" onClick={() => navigate('/student')}>
                Student Dashboard
              </Button>
            )}
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 