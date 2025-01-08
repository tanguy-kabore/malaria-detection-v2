import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  MenuItem,
  Avatar,
  Divider
} from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const schema = yup.object().shape({
  firstName: yup.string().required('Prénom requis'),
  lastName: yup.string().required('Nom requis'),
  speciality: yup.string().required('Spécialité requise'),
  licenseNumber: yup.string().required('Numéro de licence requis'),
  hospital: yup.string().required('Hôpital/Clinique requis'),
  phoneNumber: yup.string().required('Numéro de téléphone requis')
});

const specialities = [
  'Médecine Générale',
  'Pédiatrie',
  'Médecine Interne',
  'Infectiologie',
  'Hématologie',
  'Biologie Médicale',
  'Autre'
];

const Profile = () => {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    const fetchDoctorData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'doctors', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            reset(docSnap.data());
          }
        } catch (error) {
          setError('Erreur lors du chargement des données');
        }
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [user, reset]);

  const onSubmit = async (data) => {
    try {
      const docRef = doc(db, 'doctors', user.uid);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      setSuccess(true);
      setError('');
    } catch (error) {
      setError('Erreur lors de la mise à jour du profil');
      setSuccess(false);
    }
  };

  if (loading) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Box sx={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      p: 3 
    }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              fontSize: '2rem',
              mr: 2
            }}
          >
            {user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              Mon Profil
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Profil mis à jour avec succès
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prénom"
                {...register('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nom"
                {...register('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Spécialité"
                {...register('speciality')}
                error={!!errors.speciality}
                helperText={errors.speciality?.message}
              >
                {specialities.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numéro de licence médicale"
                {...register('licenseNumber')}
                error={!!errors.licenseNumber}
                helperText={errors.licenseNumber?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hôpital/Clinique"
                {...register('hospital')}
                error={!!errors.hospital}
                helperText={errors.hospital?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numéro de téléphone"
                {...register('phoneNumber')}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 2 }}
              >
                Mettre à jour le profil
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default Profile;
