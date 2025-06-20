const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SQL Sketcher Backend',
    apiKeyConfigured: process.env.OPENAI_API_KEY ? 'Yes' : 'No'
  });
});

// Ruta básica de generación SQL
app.post('/api/sql/generate', async (req, res) => {
  const { tables, description } = req.body;

  // Para testing, generar un SQL de ejemplo (sin necesidad de API Key)
  console.log('🔧 Generando SQL de prueba con', tables?.length || 0, 'tablas...');
  
  let sqlCode = `-- SQL generado automáticamente por el backend personalizado
-- ${description || 'Sin descripción'}  
-- Generado el: ${new Date().toISOString()}

CREATE DATABASE IF NOT EXISTS test_database;
USE test_database;

`;

  // Generar CREATE TABLE para cada tabla
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
  } else {
    // Tabla por defecto si no se envían tablas
    sqlCode += `-- Tabla por defecto
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO usuarios (nombre, email) VALUES 
('Usuario Test', 'test@example.com'),
('Admin', 'admin@example.com');`;
  }

  res.json({
    success: true,
    sqlCode: sqlCode,
    message: 'SQL generado exitosamente (backend personalizado)',
    tablesReceived: tables?.length || 0,
    mode: 'backend-test',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key configurada: ${process.env.OPENAI_API_KEY ? 'Sí' : 'No'}`);
});
