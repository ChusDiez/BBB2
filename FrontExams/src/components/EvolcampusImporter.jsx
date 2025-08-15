import React, { useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  CloudUpload,
  Preview,
  CheckCircle,
  Error,
  Edit,
  Save,
  Cancel,
  FileDownload,
  History,
  Warning,
  Info
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useEvolcampusImport } from '../hooks/useEvolcampusImport';
import '../styles/evolcampus-import.scss';

// Styled components
const UploadBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.dark,
  },
  '&.dragover': {
    borderColor: theme.palette.secondary.main,
    backgroundColor: theme.palette.action.hover,
  }
}));

const StatsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
}));

/**
 * Componente principal para importar CSV desde Evolcampus
 * Maneja todo el flujo: upload -> preview -> confirmación
 */
const EvolcampusImporter = () => {
  // Hook personalizado con toda la lógica
  const {
    activeStep,
    loading,
    file,
    topic,
    previewData,
    selectedQuestions,
    editingQuestion,
    error,
    success,
    importResult,
    handleFileSelect,
    handleFileDrop,
    handleTopicChange,
    handleQuestionToggle,
    handleSelectAll,
    handleDeselectAll,
    handleEditQuestion,
    handleSaveEdit,
    handleCancelEdit,
    generatePreview,
    confirmImport,
    handleReset,
    calculateBlock,
    getStatsSummary,
    clearMessages
  } = useEvolcampusImport();

  // Estados locales para UI
  const [showAllSelected, setShowAllSelected] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const steps = ['Subir archivo y especificar tema', 'Preview y edición', 'Confirmación'];

  // Manejar drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileDrop(droppedFile);
    }
  }, [handleFileDrop]);

  const handleFileInputChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Renderizar paso 1: Upload y configuración
  const renderStep1 = () => (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Paso 1: Subir archivo CSV y especificar tema
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <UploadBox
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {file ? file.name : 'Arrastra tu archivo CSV aquí o haz clic para seleccionar'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Formato esperado: Evolcampus CSV con respuestas marcadas con "x"
          </Typography>
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </UploadBox>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Tema (1-45)"
          type="number"
          value={topic}
          onChange={(e) => handleTopicChange(e.target.value)}
          inputProps={{ min: 1, max: 45 }}
          helperText={topic ? `Bloque calculado: ${calculateBlock(topic) || 'Inválido'}` : 'Especifica el tema para calcular el bloque automáticamente'}
        />
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={generatePreview}
          disabled={!file || !topic || loading}
          startIcon={<Preview />}
        >
          Generar Preview
        </Button>
      </Box>
    </Box>
  );

  // Renderizar tabla de preview editable
  const renderPreviewTable = () => {
    if (!previewData) return null;

    const filteredQuestions = showAllSelected 
      ? previewData.questions 
      : previewData.questions.filter((_, index) => selectedQuestions.has(index));

    return (
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedQuestions.size === previewData.questions.length}
                  indeterminate={selectedQuestions.size > 0 && selectedQuestions.size < previewData.questions.length}
                  onChange={() => {
                    if (selectedQuestions.size === previewData.questions.length) {
                      handleDeselectAll();
                    } else {
                      handleSelectAll();
                    }
                  }}
                />
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Pregunta</TableCell>
              <TableCell>Opción A</TableCell>
              <TableCell>Opción B</TableCell>
              <TableCell>Opción C</TableCell>
              <TableCell>Correcta</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredQuestions.map((question, displayIndex) => {
              const actualIndex = showAllSelected 
                ? displayIndex 
                : previewData.questions.findIndex(q => q === question);
              const isEditing = editingQuestion === actualIndex;
              const isSelected = selectedQuestions.has(actualIndex);

              return (
                <QuestionRow
                  key={actualIndex}
                  question={question}
                  index={actualIndex}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  onToggle={handleQuestionToggle}
                  onEdit={handleEditQuestion}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Renderizar paso 2: Preview y edición
  const renderStep2 = () => {
    const stats = getStatsSummary();
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Paso 2: Preview y edición de preguntas
        </Typography>

        {/* Estadísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <StatsCard>
              <Typography variant="h4" color="primary">{stats?.total || 0}</Typography>
              <Typography variant="body2">Total</Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <StatsCard>
              <Typography variant="h4" color="success.main">{stats?.newSelected || 0}</Typography>
              <Typography variant="body2">Nuevas</Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <StatsCard>
              <Typography variant="h4" color="warning.main">{stats?.duplicatesSelected || 0}</Typography>
              <Typography variant="body2">Duplicadas</Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={12} md={3}>
            <StatsCard>
              <Typography variant="h4" color="info.main">{stats?.selected || 0}</Typography>
              <Typography variant="body2">Seleccionadas</Typography>
            </StatsCard>
          </Grid>
        </Grid>

      {/* Controles */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button onClick={handleSelectAll} variant="outlined" size="small">
          Seleccionar todas
        </Button>
        <Button onClick={handleDeselectAll} variant="outlined" size="small">
          Deseleccionar todas
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={showAllSelected}
              onChange={(e) => setShowAllSelected(e.target.checked)}
            />
          }
          label="Mostrar todas"
        />
      </Box>

      {/* Errores si los hay */}
      {previewData.errors && previewData.errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Se encontraron errores en algunas filas:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {previewData.errors.slice(0, 5).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          {previewData.hasMoreErrors && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Y {previewData.errors.length - 5} errores más...
            </Typography>
          )}
        </Alert>
      )}

      {/* Tabla de preview */}
      {renderPreviewTable()}

      {/* Botones de acción */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={handleReset} variant="outlined">
          Volver al inicio
        </Button>
        <Button
          onClick={() => setConfirmDialog(true)}
          variant="contained"
          disabled={selectedQuestions.size === 0}
          startIcon={<CheckCircle />}
        >
          Confirmar importación ({selectedQuestions.size} preguntas)
        </Button>
      </Box>
    </Box>
    );
  };

  // Renderizar paso 3: Confirmación y resultados
  const renderStep3 = () => (
    <Box sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
      <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        ¡Importación completada exitosamente!
      </Typography>
      
      {importResult && (
        <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
          <Grid item xs={6}>
            <StatsCard>
              <Typography variant="h4" color="success.main">
                {importResult.summary.newQuestions}
              </Typography>
              <Typography variant="body2">Preguntas nuevas</Typography>
            </StatsCard>
          </Grid>
          <Grid item xs={6}>
            <StatsCard>
              <Typography variant="h4" color="warning.main">
                {importResult.summary.updatedQuestions}
              </Typography>
              <Typography variant="body2">Preguntas actualizadas</Typography>
            </StatsCard>
          </Grid>
        </Grid>
      )}

      <Button
        onClick={handleReset}
        variant="contained"
        size="large"
        sx={{ mt: 2 }}
      >
        Realizar otra importación
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Importar CSV desde Evolcampus
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Importa preguntas de examen desde archivos CSV de Evolcampus con detección automática de respuestas
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Progress bar */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearMessages}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={clearMessages}>
            {success}
          </Alert>
        )}

        {/* Steps content */}
        {activeStep === 0 && renderStep1()}
        {activeStep === 1 && renderStep2()}
        {activeStep === 2 && renderStep3()}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmar importación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que quieres importar {selectedQuestions.size} preguntas?
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • {previewData?.questions.filter((_, i) => selectedQuestions.has(i) && !previewData.questions[i].isDuplicate).length || 0} preguntas nuevas se crearán
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • {previewData?.questions.filter((_, i) => selectedQuestions.has(i) && previewData.questions[i].isDuplicate).length || 0} preguntas duplicadas se actualizarán
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={confirmImport} variant="contained" disabled={loading}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

// Componente para renderizar cada fila de pregunta
const QuestionRow = React.memo(({ question, index, isSelected, isEditing, onToggle, onEdit, onSave, onCancel }) => {
  const [editData, setEditData] = useState({});

  const handleEditChange = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(index, editData);
    setEditData({});
  }, [index, editData, onSave]);

  const handleCancel = useCallback(() => {
    setEditData({});
    onCancel();
  }, [onCancel]);

  if (isEditing) {
    return (
      <TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell padding="checkbox">
          <Checkbox checked={isSelected} onChange={() => onToggle(index)} />
        </TableCell>
        <TableCell>
          <Chip 
            label={question.isDuplicate ? 'Actualizar' : 'Nueva'} 
            color={question.isDuplicate ? 'warning' : 'success'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <TextField
            multiline
            rows={2}
            fullWidth
            size="small"
            defaultValue={question.question}
            onChange={(e) => handleEditChange('question', e.target.value)}
          />
        </TableCell>
        <TableCell>
          <TextField
            fullWidth
            size="small"
            defaultValue={question.optionA}
            onChange={(e) => handleEditChange('optionA', e.target.value)}
          />
        </TableCell>
        <TableCell>
          <TextField
            fullWidth
            size="small"
            defaultValue={question.optionB}
            onChange={(e) => handleEditChange('optionB', e.target.value)}
          />
        </TableCell>
        <TableCell>
          <TextField
            fullWidth
            size="small"
            defaultValue={question.optionC}
            onChange={(e) => handleEditChange('optionC', e.target.value)}
          />
        </TableCell>
        <TableCell>
          <TextField
            select
            size="small"
            defaultValue={question.correctAnswer}
            onChange={(e) => handleEditChange('correctAnswer', e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </TextField>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleSave} color="primary" size="small">
              <Save />
            </IconButton>
            <IconButton onClick={handleCancel} color="secondary" size="small">
              <Cancel />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow sx={{ bgcolor: question.isDuplicate ? 'warning.light' : 'inherit' }}>
      <TableCell padding="checkbox">
        <Checkbox checked={isSelected} onChange={() => onToggle(index)} />
      </TableCell>
      <TableCell>
        <Chip 
          label={question.isDuplicate ? 'Duplicada' : 'Nueva'} 
          color={question.isDuplicate ? 'warning' : 'success'}
          size="small"
        />
      </TableCell>
      <TableCell sx={{ maxWidth: 300 }}>
        <Typography variant="body2" noWrap>
          {question.question.length > 100 
            ? `${question.question.substring(0, 100)}...`
            : question.question
          }
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 150 }}>
        <Typography variant="body2" noWrap>{question.optionA}</Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 150 }}>
        <Typography variant="body2" noWrap>{question.optionB}</Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 150 }}>
        <Typography variant="body2" noWrap>{question.optionC}</Typography>
      </TableCell>
      <TableCell>
        <Chip label={question.correctAnswer} color="primary" size="small" />
      </TableCell>
      <TableCell>
        <Tooltip title="Editar pregunta">
          <IconButton onClick={() => onEdit(index)} size="small">
            <Edit />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
});

export default EvolcampusImporter;
