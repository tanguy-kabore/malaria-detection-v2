import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  IconButton,
  Stack
} from '@mui/material';
import {
  Biotech,
  ZoomIn,
  ZoomOut,
  Edit,
  Save,
  Close,
  Visibility,
  VisibilityOff,
  ZoomOutMap,
  Refresh as RestartAlt
} from '@mui/icons-material';
import axios from 'axios';

const ImageAnalysis = ({ image, results }) => {
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const zoomImageRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCells, setEditedCells] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showZoomDialog, setShowZoomDialog] = useState(false);
  const [showCellNumbers, setShowCellNumbers] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentImage, setCurrentImage] = useState(image);
  const [zoom, setZoom] = useState(1);
  const [showFullScreen, setShowFullScreen] = useState(false);

  useEffect(() => {
    if (results) {
      setEditedCells(results.cells.map(cell => ({ ...cell })));
    }
  }, [results]);

  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  const drawCanvas = (canvas, img, scale = 1) => {
    if (!canvas || !img || !editedCells) return;

    const ctx = canvas.getContext('2d');
    
    // Définir la taille du canvas
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Dessiner l'image
    ctx.drawImage(img, 0, 0);
    
    // Dessiner les cellules
    editedCells.forEach(cell => {
      const [minr, minc, maxr, maxc] = cell.bbox;
      
      // Définir les styles
      if (cell.is_infected) {
        ctx.strokeStyle = '#dc2626';
        ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
      } else {
        ctx.strokeStyle = '#16a34a';
        ctx.fillStyle = 'rgba(22, 163, 74, 0.2)';
      }
      
      ctx.lineWidth = 2 * scale;
      
      // Dessiner le rectangle
      ctx.fillRect(minc, minr, maxc - minc, maxr - minr);
      ctx.strokeRect(minc, minr, maxc - minc, maxr - minr);
      
      // Ajouter le label si showCellNumbers est true
      if (showCellNumbers) {
        const text = `#${cell.cell_id + 1}`;
        ctx.font = `${12 * scale}px Arial`;
        const textWidth = ctx.measureText(text).width;
        const textX = minc + 5;
        const textY = minr + 15 * scale;
        
        ctx.fillStyle = cell.is_infected ? '#dc2626' : '#16a34a';
        ctx.fillRect(textX - 2, textY - 10 * scale, textWidth + 4, 14 * scale);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, textX, textY);
      }
    });
  };

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = () => drawCanvas(canvasRef.current, imageRef.current);
    }
  }, [editedCells, showCellNumbers]);

  useEffect(() => {
    if (showZoomDialog && zoomImageRef.current) {
      const handleImageLoad = () => {
        const img = zoomImageRef.current;
        const canvas = zoomCanvasRef.current;
        
        if (img && canvas) {
          // Ajuster le canvas aux dimensions réelles de l'image affichée
          const rect = img.getBoundingClientRect();
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          
          // Dessiner sur le canvas avec les dimensions réelles de l'image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          drawCanvas(canvas, img, 2);
        }
      };

      // Si l'image est déjà chargée
      if (zoomImageRef.current.complete) {
        handleImageLoad();
      } else {
        // Si l'image n'est pas encore chargée
        zoomImageRef.current.onload = handleImageLoad;
      }
    }
  }, [showZoomDialog, editedCells, showCellNumbers]);

  const handleCanvasClick = (event, isZoomed = false) => {
    if (!isEditing) return;

    const canvas = isZoomed ? zoomCanvasRef.current : canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    // Trouver la cellule cliquée
    const clickedCell = editedCells.find(cell => {
      const [minr, minc, maxr, maxc] = cell.bbox;
      return canvasX >= minc && canvasX <= maxc && canvasY >= minr && canvasY <= maxr;
    });

    if (clickedCell) {
      setSelectedCell(clickedCell);
      setShowDialog(true);
    }
  };

  const handleCellStatusChange = (event, newStatus) => {
    if (newStatus === null || !selectedCell) return;

    const updatedCells = editedCells.map(cell => {
      if (cell.cell_id === selectedCell.cell_id) {
        return {
          ...cell,
          is_infected: newStatus === 'infected'
        };
      }
      return cell;
    });

    setEditedCells(updatedCells);
    setShowDialog(false);
    drawCanvas(canvasRef.current, imageRef.current);
    if (showZoomDialog) {
      drawCanvas(zoomCanvasRef.current, zoomImageRef.current, 2);
    }
  };

  const handleSaveAnnotations = async () => {
    try {
      // Créer un canvas temporaire pour convertir l'image en base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // S'assurer que imageRef.current est chargé
      if (!imageRef.current || !imageRef.current.complete) {
        throw new Error("L'image n'est pas encore chargée");
      }
      
      // Définir les dimensions du canvas
      canvas.width = imageRef.current.naturalWidth;
      canvas.height = imageRef.current.naturalHeight;
      
      // Dessiner l'image sur le canvas
      ctx.drawImage(imageRef.current, 0, 0);
      
      // Convertir en base64
      const imageBase64 = canvas.toDataURL('image/jpeg');

      const annotationData = {
        image_id: Date.now().toString(),
        annotations: editedCells,
        image: imageBase64
      };

      // Envoyer au serveur
      const response = await axios.post('http://localhost:5000/annotations/save', annotationData);
      
      setSnackbar({
        open: true,
        message: 'Annotations sauvegardées avec succès',
        severity: 'success'
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erreur lors de la sauvegarde des annotations',
        severity: 'error'
      });
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Biotech sx={{ color: '#0284c7' }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  startIcon={showCellNumbers ? <Visibility /> : <VisibilityOff />}
                  onClick={() => {
                    setShowCellNumbers(!showCellNumbers);
                    drawCanvas(canvasRef.current, imageRef.current);
                    if (showZoomDialog) {
                      drawCanvas(zoomCanvasRef.current, zoomImageRef.current, 2);
                    }
                  }}
                  variant="outlined"
                  color="primary"
                  size="medium"
                  sx={{
                    minWidth: '160px',
                    height: '40px',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: '#f0f9ff'
                    }
                  }}
                >
                  {showCellNumbers ? 'Afficher Numéros' : 'Masquer Numéros'}
                </Button>
                {!isEditing ? (
                  <Button
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                    variant="outlined"
                    color="primary"
                    size="medium"
                    sx={{
                      minWidth: '120px',
                      height: '40px',
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      '&:hover': {
                        backgroundColor: '#f0f9ff'
                      }
                    }}
                  >
                    Modifier
                  </Button>
                ) : (
                  <>
                    <Button
                      startIcon={<Save />}
                      onClick={handleSaveAnnotations}
                      variant="contained"
                      color="primary"
                      size="medium"
                      sx={{
                        minWidth: '140px',
                        height: '40px',
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        '&:hover': {
                          boxShadow: '0 4px 6px rgba(0,0,0,0.12)'
                        }
                      }}
                    >
                      Sauvegarder
                    </Button>
                    <Button
                      startIcon={<Close />}
                      onClick={() => {
                        setIsEditing(false);
                        setEditedCells(results.cells.map(cell => ({ ...cell })));
                        drawCanvas(canvasRef.current, imageRef.current);
                        drawCanvas(zoomCanvasRef.current, zoomImageRef.current, 2);
                      }}
                      variant="outlined"
                      color="error"
                      size="medium"
                      sx={{
                        minWidth: '120px',
                        height: '40px',
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        borderColor: '#fee2e2',
                        color: '#ef4444',
                        '&:hover': {
                          backgroundColor: '#fef2f2',
                          borderColor: '#fecaca'
                        }
                      }}
                    >
                      Annuler
                    </Button>
                  </>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <img
                  ref={imageRef}
                  src={currentImage}
                  alt="Analyse microscopique"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-in-out'
                  }}
                  onLoad={() => drawCanvas(canvasRef.current, imageRef.current)}
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-in-out',
                    pointerEvents: isEditing ? 'auto' : 'none',
                    cursor: isEditing ? 'pointer' : 'default'
                  }}
                />
              </Box>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }
                }}
                onClick={() => setShowFullScreen(true)}
              >
                <ZoomOutMap />
              </IconButton>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              color: '#334155',
              mb: 3
            }}
          >
            Détails de l'Analyse
          </Typography>
          {results && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2 
            }}>
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: results.summary.has_malaria ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${results.summary.has_malaria ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 1
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: results.summary.has_malaria ? '#991b1b' : '#166534',
                    fontWeight: 600
                  }}
                >
                  {results.summary.has_malaria ? 'Paludisme Détecté' : 'Aucun Paludisme Détecté'}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: results.summary.has_malaria ? '#dc2626' : '#16a34a',
                    mt: 1
                  }}
                >
                  Type: {results.summary.malaria_type || 'Non détecté'}
                </Typography>
              </Paper>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 2 
              }}>
                <Paper sx={{ p: 2, backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Typography variant="h4" sx={{ color: '#334155', fontWeight: 600 }}>
                    {results.summary.total_cells}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                    Cellules Totales
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Typography variant="h4" sx={{ color: '#dc2626', fontWeight: 600 }}>
                    {results.summary.infected_cells}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                    Cellules Infectées
                  </Typography>
                </Paper>
              </Box>

              <Paper sx={{ 
                p: 2, 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0' 
              }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1 }}>
                  Taux d'Infection
                </Typography>
                <Typography variant="h4" sx={{ color: '#334155', fontWeight: 600 }}>
                  {(results.summary.infection_rate * 100).toFixed(2)}%
                </Typography>
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Dialog pour modifier le statut d'une cellule */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Modifier le Statut de la Cellule #{selectedCell?.cell_id + 1}</DialogTitle>
        <DialogContent>
          <ToggleButtonGroup
            value={selectedCell?.is_infected ? 'infected' : 'healthy'}
            exclusive
            onChange={handleCellStatusChange}
          >
            <ToggleButton 
              value="healthy"
              sx={{ 
                '&.Mui-selected': { 
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  '&:hover': { backgroundColor: '#bbf7d0' }
                }
              }}
            >
              Saine
            </ToggleButton>
            <ToggleButton 
              value="infected"
              sx={{ 
                '&.Mui-selected': { 
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  '&:hover': { backgroundColor: '#fecaca' }
                }
              }}
            >
              Infectée
            </ToggleButton>
          </ToggleButtonGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            m: 2,
            p: 2,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>
          Vue détaillée de l'image
          <IconButton
            onClick={() => setShowFullScreen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'background.default',
              p: 2
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <img
                ref={zoomImageRef}
                src={currentImage}
                alt="Analyse microscopique - Vue détaillée"
                style={{
                  maxWidth: 'none',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-in-out'
                }}
                onLoad={() => drawCanvas(zoomCanvasRef.current, zoomImageRef.current)}
              />
              <canvas
                ref={zoomCanvasRef}
                onClick={(e) => handleCanvasClick(e, true)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-in-out',
                  pointerEvents: isEditing ? 'auto' : 'none',
                  cursor: isEditing ? 'pointer' : 'default'
                }}
              />
            </Box>
          </Box>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              <IconButton onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>
                <ZoomOut />
              </IconButton>
              <Typography variant="body2">
                Zoom: {(zoom * 100).toFixed(0)}%
              </Typography>
              <IconButton onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}>
                <ZoomIn />
              </IconButton>
              <IconButton onClick={() => setZoom(1)}>
                <RestartAlt />
              </IconButton>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ImageAnalysis;
