import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Comment as CommentIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  FiberManualRecord as CircleIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getPatientAnalyses, addAnalysisComment } from '../../models/patient';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PatientHistory = ({ patient }) => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadAnalyses();
  }, [patient]);

  const loadAnalyses = async () => {
    try {
      const patientAnalyses = await getPatientAnalyses(patient.id);
      setAnalyses(patientAnalyses.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      ));
      setLoading(false);
    } catch (error) {
      console.error('Error loading analyses:', error);
      setLoading(false);
    }
  };

  const handleAddComment = async (analysisId, commentText) => {
    try {
      await addAnalysisComment(analysisId, commentText);
      
      // Mettre à jour les analyses et l'analyse sélectionnée
      const updatedAnalyses = analyses.map(analysis => {
        if (analysis.id === analysisId) {
          const updatedAnalysis = {
            ...analysis,
            comments: [
              ...(analysis.comments || []),
              {
                text: commentText,
                createdAt: new Date().toISOString()
              }
            ]
          };
          // Mettre à jour l'analyse sélectionnée si c'est celle qui est modifiée
          if (selectedAnalysis && selectedAnalysis.id === analysisId) {
            setSelectedAnalysis(updatedAnalysis);
          }
          return updatedAnalysis;
        }
        return analysis;
      });
      
      setAnalyses(updatedAnalyses);
      setComment(''); // Réinitialiser le champ de commentaire
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSubmitComment = () => {
    if (comment.trim() && selectedAnalysis) {
      handleAddComment(selectedAnalysis.id, comment);
    }
  };

  const getInfectionTrend = () => {
    const sortedAnalyses = [...analyses].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return {
      labels: sortedAnalyses.map(a => new Date(a.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Taux d\'infection (%)',
          data: sortedAnalyses.map(a => (a.results.summary.infection_rate * 100).toFixed(2)),
          borderColor: '#2196f3',
          tension: 0.4,
        }
      ]
    };
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Évolution du taux d'infection"
          avatar={<TrendingUpIcon color="primary" />}
        />
        <CardContent>
          {analyses.length > 1 ? (
            <Line
              data={getInfectionTrend()}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                  }
                }
              }}
            />
          ) : (
            <Typography color="text.secondary" align="center">
              Pas assez de données pour afficher l'évolution
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Historique des analyses"
          avatar={<AssignmentIcon color="primary" />}
        />
        <CardContent>
          <Stack spacing={2}>
            {analyses.map((analysis) => (
              <Paper
                key={analysis.id}
                elevation={1}
                sx={{ p: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CircleIcon sx={{ fontSize: 12, mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle1">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={`${analysis.results.summary.total_cells} cellules`}
                  />
                  <Chip
                    size="small"
                    color="error"
                    label={`${analysis.results.summary.infected_cells} infectées`}
                  />
                  <Chip
                    size="small"
                    color="primary"
                    label={`${(analysis.results.summary.infection_rate * 100).toFixed(2)}% taux`}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedAnalysis(analysis);
                      setShowAnalysisDetails(true);
                    }}
                  >
                    <CommentIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>

          {analyses.length === 0 && (
            <Typography color="text.secondary" align="center">
              Aucune analyse enregistrée
            </Typography>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showAnalysisDetails}
        onClose={() => setShowAnalysisDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedAnalysis && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Détails de l'analyse du {new Date(selectedAnalysis.timestamp).toLocaleDateString()}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cellules totales
                  </Typography>
                  <Typography variant="h4">
                    {selectedAnalysis.results.summary.total_cells}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cellules infectées
                  </Typography>
                  <Typography variant="h4" color="error">
                    {selectedAnalysis.results.summary.infected_cells}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Taux d'infection
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {(selectedAnalysis.results.summary.infection_rate * 100).toFixed(2)}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Commentaires
              </Typography>
              <List>
                {selectedAnalysis.comments?.map((comment, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={comment.text}
                      secondary={new Date(comment.createdAt).toLocaleString()}
                    />
                  </ListItem>
                ))}
                {(!selectedAnalysis.comments || selectedAnalysis.comments.length === 0) && (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Aucun commentaire pour cette analyse
                  </Typography>
                )}
              </List>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ajouter un commentaire..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && comment.trim()) {
                      handleSubmitComment();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSubmitComment}
                  disabled={!comment.trim()}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        <DialogActions>
          <Button onClick={() => setShowAnalysisDetails(false)}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientHistory;
