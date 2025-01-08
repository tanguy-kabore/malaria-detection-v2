import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Button
} from '@mui/material';
import { 
  LocalHospital,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import PatientSelector from './PatientSelector';

const Header = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPatients, setShowPatients] = useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ 
        backgroundColor: '#2c3e50',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            {/* Logo et Titre */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalHospital sx={{ 
                fontSize: 40, 
                marginRight: 2,
                color: '#ecf0f1'
              }} />
              <Box>
                <Typography variant="h5" component="h1" sx={{ 
                  fontWeight: 600,
                  color: '#ecf0f1'
                }}>
                  Malaria Detection
                </Typography>
                <Typography variant="subtitle2" sx={{ 
                  color: '#bdc3c7',
                  letterSpacing: 1
                }}>
                  Système de Détection Intelligente du Paludisme
                </Typography>
              </Box>
            </Box>

            {/* Menu Utilisateur */}
            <Box>
              {user ? (
                <>
                  <Button
                    color="inherit"
                    startIcon={<PeopleIcon />}
                    onClick={() => setShowPatients(true)}
                    sx={{ mr: 2 }}
                  >
                    Patients
                  </Button>
                  <IconButton
                    onClick={handleMenu}
                    sx={{ color: '#ecf0f1' }}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#3498db' }}>
                      {user.email[0].toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <MenuItem onClick={handleProfile}>
                      <PersonIcon sx={{ mr: 2 }} />
                      Profile
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 2 }} />
                      Déconnexion
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  startIcon={<LoginIcon />}
                  onClick={() => navigate('/login')}
                  sx={{ color: '#ecf0f1' }}
                >
                  Connexion
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <PatientSelector
        open={showPatients}
        onClose={() => setShowPatients(false)}
        mode="view"
      />
    </>
  );
};

export default Header;