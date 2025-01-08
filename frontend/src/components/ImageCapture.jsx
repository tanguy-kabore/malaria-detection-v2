import React, { useRef, useState, useCallback } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { PhotoCamera, Cameraswitch } from '@mui/icons-material';
import Webcam from 'react-webcam';

const ImageCapture = ({ onCapture }) => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState('user');

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: facingMode
  };

  const handleUserMedia = () => {
    setLoading(false);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    onCapture(imageSrc);
  }, [webcamRef, onCapture]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 2,
      position: 'relative'
    }}>
      <Box sx={{ 
        width: '100%',
        position: 'relative',
        backgroundColor: 'black',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1
          }}>
            <CircularProgress color="primary" />
          </Box>
        )}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          style={{ width: '100%', display: 'block' }}
        />
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: 2,
        width: '100%',
        justifyContent: 'center'
      }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PhotoCamera />}
          onClick={capture}
          disabled={loading}
        >
          Capturer
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Cameraswitch />}
          onClick={toggleCamera}
          disabled={loading}
        >
          Changer de caméra
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" align="center">
        Assurez-vous que l'image est nette et bien éclairée pour une meilleure analyse
      </Typography>
    </Box>
  );
};

export default ImageCapture;
