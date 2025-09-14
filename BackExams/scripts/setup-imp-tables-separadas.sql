-- =============================================================================
-- 🗄️ CONFIGURACIÓN COMPLETA TEST IMPRESCINDIBLES - OPCIÓN B (4 TABLAS SEPARADAS)
-- ARCHIVO A EJECUTAR EN LA BASE DE DATOS
-- =============================================================================

-- Verificar que las tablas base existen
SELECT 'Creando tablas IMP separadas...' as status;

-- =============================================================================
-- 🗄️ CREACIÓN DE TABLAS IMP SEPARADAS (OPCIÓN B)
-- =============================================================================

-- Tabla 1: Control de disponibilidad de temas IMP
CREATE TABLE IF NOT EXISTS imp_availability_control (
  id BIGSERIAL PRIMARY KEY,
  theme_number INTEGER NOT NULL CHECK (theme_number BETWEEN 1 AND 45),
  theme_name VARCHAR(10) NOT NULL UNIQUE, -- "1_IMP", "2_IMP", etc.
  historic_id INTEGER REFERENCES historics("idExam"),
  
  -- Control temporal
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'disabled')),
  window_start_date DATE,
  window_end_date DATE,
  global_release_date DATE,
  
  -- Flags de control
  immediately_available BOOLEAN DEFAULT true,
  auto_release BOOLEAN DEFAULT true,
  released_to_global BOOLEAN DEFAULT false,
  
  -- Metadatos
  total_questions INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_theme_number UNIQUE (theme_number),
  CONSTRAINT valid_theme_name CHECK (theme_name ~ '^\d+_IMP$')
);

-- Tabla 2: Sesiones de test imprescindibles
CREATE TABLE IF NOT EXISTS imp_test_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_number INTEGER NOT NULL CHECK (theme_number BETWEEN 1 AND 45),
  theme_name VARCHAR(10) NOT NULL, -- "1_IMP", "2_IMP", etc.
  historic_id INTEGER REFERENCES historics("idExam"),
  
  -- Datos del examen
  questions_count INTEGER DEFAULT 40,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  blank_answers INTEGER DEFAULT 0,
  answered_count INTEGER GENERATED ALWAYS AS (correct_answers + wrong_answers) STORED,
  
  -- Puntuación y criterios IMP
  score_percentage DECIMAL(5,2) DEFAULT 0.00,
  passed_p80 BOOLEAN DEFAULT false,
  cutoff_p80 INTEGER DEFAULT 32, -- 80% de 40 = 32
  cutoff_p72 INTEGER DEFAULT 29, -- 72% de 40 = 28.8 ≈ 29
  passed_p72 BOOLEAN DEFAULT false,
  
  -- Tiempo y fechas
  time_spent_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_theme_name_session CHECK (theme_name ~ '^\d+_IMP$'),
  CONSTRAINT valid_scores CHECK (
    correct_answers >= 0 AND 
    wrong_answers >= 0 AND 
    blank_answers >= 0 AND
    correct_answers + wrong_answers + blank_answers <= questions_count
  ),
  CONSTRAINT valid_percentage CHECK (score_percentage BETWEEN 0 AND 100)
);

-- Tabla 3: Intentos de preguntas IMP
CREATE TABLE IF NOT EXISTS imp_question_attempts (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES imp_test_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  question_order INTEGER NOT NULL,
  
  -- Respuesta del usuario
  selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C') OR selected_answer IS NULL),
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C')),
  is_correct BOOLEAN DEFAULT false,
  marked_doubt BOOLEAN DEFAULT false,
  
  -- Tiempo por pregunta
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Tema de la pregunta
  topic INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_session_question UNIQUE (session_id, question_id),
  CONSTRAINT unique_session_order UNIQUE (session_id, question_order)
);

-- Tabla 4: Monitor de estadísticas IMP
CREATE TABLE IF NOT EXISTS imp_status_monitor (
  id BIGSERIAL PRIMARY KEY,
  theme_number INTEGER NOT NULL UNIQUE CHECK (theme_number BETWEEN 1 AND 45),
  theme_name VARCHAR(10) NOT NULL UNIQUE,
  
  -- Estadísticas globales
  total_attempts INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  
  -- Métricas de rendimiento
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  pass_rate_p80 DECIMAL(5,2) DEFAULT 0.00, -- % usuarios que aprueban con 80%
  avg_time_minutes INTEGER DEFAULT 0,
  
  -- Distribución de respuestas
  total_correct_answers INTEGER DEFAULT 0,
  total_wrong_answers INTEGER DEFAULT 0,
  total_blank_answers INTEGER DEFAULT 0,
  
  -- Última actualización
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 🔍 ÍNDICES PARA OPTIMIZACIÓN
-- =============================================================================

-- Índices para imp_availability_control
CREATE INDEX IF NOT EXISTS idx_imp_availability_theme_number ON imp_availability_control(theme_number);
CREATE INDEX IF NOT EXISTS idx_imp_availability_status ON imp_availability_control(status);
CREATE INDEX IF NOT EXISTS idx_imp_availability_dates ON imp_availability_control(window_start_date, global_release_date);

-- Índices para imp_test_sessions
CREATE INDEX IF NOT EXISTS idx_imp_sessions_user_id ON imp_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_imp_sessions_theme ON imp_test_sessions(theme_number);
CREATE INDEX IF NOT EXISTS idx_imp_sessions_user_theme ON imp_test_sessions(user_id, theme_number);
CREATE INDEX IF NOT EXISTS idx_imp_sessions_completed ON imp_test_sessions(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imp_sessions_score ON imp_test_sessions(score_percentage);

-- Índices para imp_question_attempts
CREATE INDEX IF NOT EXISTS idx_imp_attempts_session ON imp_question_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_imp_attempts_question ON imp_question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_imp_attempts_topic ON imp_question_attempts(topic);

-- Índices para imp_status_monitor
CREATE INDEX IF NOT EXISTS idx_imp_monitor_theme ON imp_status_monitor(theme_number);

-- =============================================================================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Activar RLS en todas las tablas
ALTER TABLE imp_availability_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE imp_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE imp_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE imp_status_monitor ENABLE ROW LEVEL SECURITY;

-- Políticas para imp_availability_control (lectura pública)
CREATE POLICY "imp_availability_select_all" ON imp_availability_control
  FOR SELECT USING (true);

CREATE POLICY "imp_availability_admin_all" ON imp_availability_control
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tiers ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.tier IN ('admin', 'paid')
    )
  );

-- Políticas para imp_test_sessions (usuarios ven solo sus datos)
CREATE POLICY "imp_sessions_select_own" ON imp_test_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "imp_sessions_insert_own" ON imp_test_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "imp_sessions_admin_all" ON imp_test_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tiers ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.tier = 'admin'
    )
  );

-- Políticas para imp_question_attempts (a través de sessions)
CREATE POLICY "imp_attempts_select_own" ON imp_question_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM imp_test_sessions s 
      WHERE s.id = imp_question_attempts.session_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "imp_attempts_insert_own" ON imp_question_attempts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM imp_test_sessions s 
      WHERE s.id = imp_question_attempts.session_id 
      AND s.user_id = auth.uid()
    )
  );

-- Políticas para imp_status_monitor (lectura pública)
CREATE POLICY "imp_monitor_select_all" ON imp_status_monitor
  FOR SELECT USING (true);

CREATE POLICY "imp_monitor_admin_all" ON imp_status_monitor
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tiers ut 
      WHERE ut.user_id = auth.uid() 
      AND ut.tier = 'admin'
    )
  );

-- =============================================================================
-- 🔧 FUNCIONES DE UTILIDAD
-- =============================================================================

-- Función para actualizar estadísticas de un tema
CREATE OR REPLACE FUNCTION update_imp_theme_stats(p_theme_number INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO imp_status_monitor (theme_number, theme_name)
  VALUES (p_theme_number, p_theme_number || '_IMP')
  ON CONFLICT (theme_number) DO NOTHING;
  
  UPDATE imp_status_monitor
  SET 
    total_attempts = (
      SELECT COUNT(*) 
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number
    ),
    total_users = (
      SELECT COUNT(DISTINCT user_id) 
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number
    ),
    total_completed = (
      SELECT COUNT(*) 
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number 
      AND completed_at IS NOT NULL
    ),
    avg_score = (
      SELECT COALESCE(AVG(score_percentage), 0) 
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number 
      AND completed_at IS NOT NULL
    ),
    pass_rate_p80 = (
      SELECT CASE 
        WHEN COUNT(*) = 0 THEN 0 
        ELSE (COUNT(*) FILTER (WHERE passed_p80 = true) * 100.0 / COUNT(*))
      END
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number 
      AND completed_at IS NOT NULL
    ),
    avg_time_minutes = (
      SELECT COALESCE(AVG(time_spent_seconds / 60), 0)::INTEGER
      FROM imp_test_sessions 
      WHERE theme_number = p_theme_number 
      AND completed_at IS NOT NULL
    ),
    last_updated = NOW()
  WHERE theme_number = p_theme_number;
END;
$$ LANGUAGE plpgsql;

SELECT 'Tablas IMP creadas exitosamente!' as status;
