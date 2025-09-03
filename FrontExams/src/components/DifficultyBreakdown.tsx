import React from 'react';

interface DifficultyBreakdownProps {
  breakdown: {
    MUY_FACIL: number;
    FACIL: number;
    MEDIO: number;
    DIFICIL: number;
    MUY_DIFICIL: number;
    ALEATORIO: number;
  };
  totalRequested: number;
  totalObtained: number;
  requestedDifficulty?: string;
  excludedCount?: number;
}

const DifficultyBreakdown: React.FC<DifficultyBreakdownProps> = ({
  breakdown,
  totalRequested,
  totalObtained,
  requestedDifficulty,
  excludedCount = 0
}) => {
  const difficultyColors = {
    MUY_FACIL: '#4ade80',    // verde claro
    FACIL: '#22d3ee',        // cyan
    MEDIO: '#fbbf24',        // amarillo
    DIFICIL: '#f97316',      // naranja
    MUY_DIFICIL: '#ef4444',  // rojo
    ALEATORIO: '#6b7280'     // gris
  };

  const difficultyLabels = {
    MUY_FACIL: 'Muy Fácil',
    FACIL: 'Fácil',
    MEDIO: 'Medio',
    DIFICIL: 'Difícil',
    MUY_DIFICIL: 'Muy Difícil',
    ALEATORIO: 'Aleatorio'
  };

  // Calcular si se activó el sistema de cascada
  const usedCascade = requestedDifficulty && 
    (breakdown.MUY_FACIL + breakdown.FACIL + breakdown.MEDIO + breakdown.DIFICIL + breakdown.MUY_DIFICIL) > breakdown[requestedDifficulty as keyof typeof breakdown];

  const usedRandom = breakdown.ALEATORIO > 0;

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        📊 Distribución de Preguntas por Dificultad
      </h3>
      
      {/* Información general */}
      <div className="mb-4 text-sm text-gray-600">
        <p>
          <strong>Solicitadas:</strong> {totalRequested} preguntas
          {requestedDifficulty && ` (${difficultyLabels[requestedDifficulty as keyof typeof difficultyLabels]})`}
        </p>
        <p><strong>Obtenidas:</strong> {totalObtained} preguntas</p>
        {excludedCount > 0 && (
          <p><strong>Excluidas:</strong> {excludedCount} preguntas de exámenes anteriores</p>
        )}
      </div>

      {/* Barra visual */}
      <div className="mb-4">
        <div className="flex h-8 bg-gray-200 rounded-lg overflow-hidden">
          {Object.entries(breakdown).map(([level, count]) => {
            if (count === 0) return null;
            
            const percentage = (count / totalObtained) * 100;
            return (
              <div
                key={level}
                className="flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: difficultyColors[level as keyof typeof difficultyColors],
                  minWidth: count > 0 ? '20px' : '0'
                }}
                title={`${difficultyLabels[level as keyof typeof difficultyLabels]}: ${count} preguntas`}
              >
                {count}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desglose detallado */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {Object.entries(breakdown).map(([level, count]) => {
          if (count === 0) return null;
          
          return (
            <div
              key={level}
              className="flex items-center space-x-2 p-2 rounded"
              style={{ backgroundColor: `${difficultyColors[level as keyof typeof difficultyColors]}15` }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: difficultyColors[level as keyof typeof difficultyColors] }}
              />
              <span className="text-gray-700">
                <strong>{difficultyLabels[level as keyof typeof difficultyLabels]}:</strong> {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mensajes informativos */}
      {usedCascade && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          ⚡ <strong>Sistema de cascada activado:</strong> Se buscaron preguntas en otros niveles de dificultad para completar la cantidad solicitada.
        </div>
      )}

      {usedRandom && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          🎲 <strong>Preguntas aleatorias añadidas:</strong> Se completó con preguntas aleatorias al no encontrar suficientes del nivel solicitado.
        </div>
      )}

      {excludedCount > 0 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          🚫 <strong>Exclusiones aplicadas:</strong> Se evitaron {excludedCount} preguntas de exámenes anteriores.
        </div>
      )}
    </div>
  );
};

export default DifficultyBreakdown;

