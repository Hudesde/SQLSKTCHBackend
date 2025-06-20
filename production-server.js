const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middlewares básicos
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://TU_DOMINIO.com'],
    credentials: true
  }));
} else {
  app.use(cors({
    origin: '*', // Permitir todo en desarrollo
  }));
}
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SQL Sketcher Backend',
    apiKeyConfigured: process.env.OPENAI_API_KEY ? 'Yes' : 'No',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Función para generar SQL con OpenAI
async function generateSQLWithOpenAI(tables, description) {
  try {
    // Crear el prompt para OpenAI
    const prompt = `Genera código SQL CREATE TABLE para las siguientes tablas y datos de ejemplo:

Descripción: ${description || 'Esquema de base de datos'}

Tablas:
${tables.map(table => `
- Tabla: ${table.name}
  Columnas:
  ${table.columns.map(col => `  * ${col.name} (${col.type})${col.isPrimaryKey ? ' - PRIMARY KEY' : ''}${col.isRequired ? ' - NOT NULL' : ''}`).join('\n  ')}
`).join('\n')}

Instrucciones:
1. Genera CREATE TABLE statements para cada tabla
2. Incluye constraints apropiados (PRIMARY KEY, NOT NULL, etc.)
3. Agrega algunos datos de ejemplo con INSERT statements
4. Usa comentarios para explicar cada sección
5. Asegúrate de que el SQL sea compatible con MySQL

Responde solo con el código SQL, sin explicaciones adicionales.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en bases de datos SQL. Genera código SQL limpio, bien estructurado y con comentarios explicativos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error al generar SQL con OpenAI:', error);
    throw error;
  }
}

// Función para generar SQL de prueba (fallback)
function generateTestSQL(tables, description) {
  let sqlCode = `-- SQL generado automáticamente por el backend personalizado
-- ${description || 'Sin descripción'}  
-- Generado el: ${new Date().toISOString()}

CREATE DATABASE IF NOT EXISTS sql_sketcher_db;
USE sql_sketcher_db;

`;

  if (tables && Array.isArray(tables)) {
    tables.forEach(table => {
      sqlCode += `-- Tabla: ${table.name}\n`;
      sqlCode += `CREATE TABLE \`${table.name}\` (\n`;
      
      const columns = [];
      if (table.columns && Array.isArray(table.columns)) {
        table.columns.forEach(col => {
          let columnDef = `    \`${col.name}\` ${col.type}`;
          if (col.isPrimaryKey) columnDef += ' PRIMARY KEY AUTO_INCREMENT';
          if (col.isRequired && !col.isPrimaryKey) columnDef += ' NOT NULL';
          columns.push(columnDef);
        });
      }
      
      sqlCode += columns.join(',\n');
      sqlCode += '\n);\n\n';
      
      // Agregar algunos datos de ejemplo
      sqlCode += `-- Datos de ejemplo para ${table.name}\n`;
      sqlCode += `INSERT INTO \`${table.name}\` (`;
      const insertColumns = table.columns?.filter(col => !col.isPrimaryKey).map(col => `\`${col.name}\``).join(', ') || '';
      sqlCode += insertColumns;
      sqlCode += ') VALUES\n';
      
      if (table.name.toLowerCase().includes('user')) {
        sqlCode += `    ('Juan Pérez', 'juan@email.com'),\n`;
        sqlCode += `    ('Ana García', 'ana@email.com'),\n`;
        sqlCode += `    ('Carlos López', 'carlos@email.com');\n\n`;
      } else {
        sqlCode += `    ('Ejemplo 1', 'valor1'),\n`;
        sqlCode += `    ('Ejemplo 2', 'valor2');\n\n`;
      }
    });
  }

  return sqlCode;
}

// Ruta de generación SQL con OpenAI real
app.post('/api/sql/generate', async (req, res) => {
  const { tables, description } = req.body;
  
  console.log('🔧 Generando SQL con OpenAI para', tables?.length || 0, 'tablas...');

  try {
    let sqlCode;
    let mode;
    
    // Verificar si tenemos API Key configurada
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        // Intentar generar con OpenAI
        sqlCode = await generateSQLWithOpenAI(tables, description);
        mode = 'openai';
        console.log('✅ SQL generado exitosamente con OpenAI');
      } catch (error) {
        console.error('❌ Error con OpenAI, usando fallback:', error.message);
        // Fallback al modo de prueba si OpenAI falla
        sqlCode = generateTestSQL(tables, description);
        mode = 'fallback';
      }
    } else {
      // Usar modo de prueba si no hay API Key válida
      sqlCode = generateTestSQL(tables, description);
      mode = 'test';
      console.log('⚠️  Usando modo de prueba (API Key no válida)');
    }

    res.json({
      success: true,
      sqlCode: sqlCode,
      message: `SQL generado exitosamente (${mode === 'openai' ? 'OpenAI GPT' : mode === 'fallback' ? 'Modo fallback' : 'Modo prueba'})`,
      tablesReceived: tables?.length || 0,
      mode: mode,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor SQL Sketcher Backend corriendo en puerto ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key configurada: ${process.env.OPENAI_API_KEY ? 'Sí' : 'No'}`);
  console.log(`🤖 Modelo OpenAI: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Endpoints disponibles:');
  console.log('  GET  /api/health        - Estado del servidor');
  console.log('  POST /api/sql/generate  - Generar SQL con OpenAI');
});
