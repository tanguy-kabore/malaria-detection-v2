import React, { useState } from 'react';
import { 
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  CircularProgress,
  Paper,
  Typography,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import Profile from './components/auth/Profile';
import { auth } from './config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import ResultsDisplay from './components/analysis/ResultsDisplay';
import ImageAnalysis from './components/analysis/ImageAnalysis';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import ImageCapture from './components/ImageCapture';
import { 
  PhotoCamera,
  Upload,
  Close as CloseIcon 
} from '@mui/icons-material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
};

function App() {
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setAnalysisLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await axios.post('http://localhost:5000/detection/detect', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setResults(response.data);
      } catch (err) {
        setError('Erreur lors de l\'analyse de l\'image. Veuillez réessayer.');
        console.error('Error:', err);
      } finally {
        setAnalysisLoading(false);
      }
    }
  };

  const handleCapturedImage = async (imageSrc) => {
    setShowCamera(false);
    setImage(imageSrc);
    setAnalysisLoading(true);
    setError(null);

    try {
      // Convertir le base64 en blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('image', file);

      const analysisResponse = await axios.post('http://localhost:5000/detection/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(analysisResponse.data);
    } catch (err) {
      setError('Erreur lors de l\'analyse de l\'image. Veuillez réessayer.');
      console.error('Error:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                  <Paper
                    {...getRootProps()}
                    sx={{
                      p: 3,
                      mb: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                      border: '2px dashed',
                      borderColor: isDragActive ? 'primary.main' : 'grey.300',
                    }}
                  >
                    <input {...getInputProps()} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {isDragActive ? 'Déposez l\'image ici' : 'Analysez une image de sang'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<PhotoCamera />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCamera(true);
                          }}
                        >
                          Prendre une photo
                        </Button>
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={<Upload />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = document.querySelector('input[type="file"]');
                            if (input) input.click();
                          }}
                        >
                          Charger une image
                        </Button>
                      </Box>
                    </Box>
                  </Paper>

                  <Dialog
                    open={showCamera}
                    onClose={() => setShowCamera(false)}
                    maxWidth="md"
                    fullWidth
                  >
                    <DialogTitle>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Prendre une photo
                        <IconButton onClick={() => setShowCamera(false)}>
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </DialogTitle>
                    <DialogContent>
                      <ImageCapture onCapture={handleCapturedImage} />
                    </DialogContent>
                  </Dialog>

                  {analysisLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress />
                    </Box>
                  )}

                  {error && (
                    <Typography color="error" align="center" gutterBottom>
                      {error}
                    </Typography>
                  )}

                  {image && !analysisLoading && (
                    <ImageAnalysis image={image} results={results} />
                  )}

                  {results && !analysisLoading && (
                    <ResultsDisplay results={results} />
                  )}
                </Container>
              </Box>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
