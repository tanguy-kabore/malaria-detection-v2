import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  History as HistoryIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getPatients, createPatient } from '../models/patient';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import PatientHistory from './patient/PatientHistory';

const NewPatientForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth
          margin="normal"
          label="Prénom"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Nom"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Date de naissance"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          select
          fullWidth
          margin="normal"
          
          name="gender"
          value={formData.gender || ''}
          onChange={handleChange}
          SelectProps={{ native: true }}
          required
        >
          <option value="" disabled>
            Sélectionner le genre
          </option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </TextField>
        <TextField
          fullWidth
          margin="normal"
          label="Téléphone"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
        />
      </Stack>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="contained" color="primary">
          Ajouter le patient
        </Button>
      </Box>
    </Box>
  );
};

const PatientSelector = ({ open, onClose, onSelectPatient, mode = 'select' }) => {
  const [user] = useAuthState(auth);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    try {
      const patientsList = await getPatients(user.uid);
      setPatients(patientsList);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPatient = async (patientData) => {
    try {
      setLoading(true);
      await createPatient({
        ...patientData,
        doctorId: user.uid
      });
      await loadPatients();
      setShowNewPatientForm(false);
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  const handlePatientClick = (patient) => {
    if (mode === 'select') {
      onSelectPatient(patient);
    } else {
      setSelectedPatient(patient);
      setShowHistory(true);
    }
  };

  const filteredPatients = patients.filter(patient => 
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {mode === 'select' ? 'Sélectionner un patient' : 'Gérer les patients'}
            <Box>
              <IconButton
                color="primary"
                onClick={() => setShowNewPatientForm(true)}
                disabled={showNewPatientForm}
              >
                <PersonAddIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {showNewPatientForm ? (
            <NewPatientForm
              onSubmit={handleNewPatient}
              onCancel={() => setShowNewPatientForm(false)}
            />
          ) : (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="Rechercher un patient"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List sx={{ mt: 2 }}>
                  {filteredPatients.map((patient) => (
                    <React.Fragment key={patient.id}>
                      <ListItem
                        button
                        onClick={() => handlePatientClick(patient)}
                        secondaryAction={
                          mode === 'view' && (
                            <IconButton edge="end" onClick={() => handlePatientClick(patient)}>
                              <HistoryIcon />
                            </IconButton>
                          )
                        }
                      >
                        <ListItemText
                          primary={`${patient.firstName} ${patient.lastName}`}
                          secondary={`Né(e) le ${new Date(patient.dateOfBirth).toLocaleDateString()}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                  {filteredPatients.length === 0 && !loading && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      Aucun patient trouvé
                    </Typography>
                  )}
                </List>
              )}
            </>
          )}
        </DialogContent>
        {!showNewPatientForm && (
          <DialogActions>
            <Button onClick={onClose}>Fermer</Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPatient && `Historique de ${selectedPatient.firstName} ${selectedPatient.lastName}`}
        </DialogTitle>
        <DialogContent>
          {selectedPatient && <PatientHistory patient={selectedPatient} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PatientSelector;
