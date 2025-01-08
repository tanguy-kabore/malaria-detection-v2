import React, { useState } from 'react';
import {
  Box,
  Card,
  Collapse,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CardHeader,
  CardContent,
  useTheme,
  Button
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle,
  Cancel,
  Error as ErrorIcon,
  CheckCircleOutline,
  ExpandMore,
  SaveAlt,
  FiberManualRecord as CircleIcon
} from '@mui/icons-material';
import { saveAnalysis } from '../../models/patient';
import PatientSelector from '../PatientSelector';

// Composant pour afficher le statut avec un style approprié
const StatusChip = ({ isInfected }) => {
  const theme = useTheme();
  const color = isInfected ? 'error' : 'success';
  const backgroundColor = alpha(theme.palette[color].main, 0.1);

  return (
    <Chip
      label={isInfected ? 'Infectée' : 'Saine'}
      color={color}
      size="small"
      sx={{
        backgroundColor: backgroundColor,
        borderColor: 'transparent',
        fontWeight: 600,
        fontSize: '0.8125rem',
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
      }}
    />
  );
};

const ResultsDisplay = ({ results }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveToPatient = async (patient) => {
    try {
      setSaving(true);
      
      // Déterminer le statut en fonction du taux d'infection
      const infectionRate = results.summary.infection_rate;
      const status = infectionRate > 0 ? "Paludisme Détecté" : "Aucun Paludisme Détecté";

      // Créer un résumé des résultats pour la sauvegarde
      const analysisData = {
        results: {
          summary: {
            total_cells: results.summary.total_cells,
            infected_cells: results.summary.infected_cells,
            infection_rate: Number(results.summary.infection_rate.toFixed(2)),
            status: status
          }
        },
        timestamp: new Date().toISOString()
      };

      await saveAnalysis(patient.id, analysisData);
      setSaveSuccess(true);
      setShowPatientSelector(false);
      // Afficher un message de succès temporaire
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving analysis:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!results) return null;

  const getConfidenceColor = (confidence) => {
    if (confidence < 0.6) return theme.palette.error.main;
    if (confidence < 0.8) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Card sx={{ mt: 3, overflow: 'visible' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Résultats de l'Analyse</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {saveSuccess && (
                <Chip
                  label="Sauvegardé!"
                  color="success"
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SaveAlt />}
                onClick={() => setShowPatientSelector(true)}
                disabled={saving}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder au dossier patient'}
              </Button>
            </Box>
          </Box>
        }
        action={
          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }}
          >
            <ExpandMore />
          </IconButton>
        }
      />
      <Collapse in={expanded}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                  <TableCell sx={{ fontWeight: 600, width: '15%' }}>ID Cellule</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: '25%' }}>Statut</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '30%' }}>Confiance</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, width: '30%' }}>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.cells.map((cell) => (
                  <TableRow 
                    key={cell.cell_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 1 
                      }}>
                        <CircleIcon 
                          sx={{ 
                            color: cell.is_infected 
                              ? theme.palette.error.main 
                              : theme.palette.success.main,
                            fontSize: 10 
                          }} 
                        />
                        <Typography variant="body2">
                          #{cell.cell_id + 1}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusChip isInfected={cell.is_infected} />
                    </TableCell>
                    <TableCell align="right">
                      <Box 
                        sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: getConfidenceColor(cell.confidence),
                          fontWeight: 500
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {(cell.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {cell.metrics.mean_score.toFixed(3)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Collapse>

      <PatientSelector
        open={showPatientSelector}
        onClose={() => setShowPatientSelector(false)}
        onSelectPatient={handleSaveToPatient}
      />
    </Card>
  );
};

export default ResultsDisplay;
