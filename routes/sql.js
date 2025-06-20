const express = require('express');
const OpenAI = require('openai');
// const authMiddleware = require('../middleware/auth');  // Comentado temporalmente
// const SqlHistory = require('../models/SqlHistory');   // Comentado temporalmente

const router = express.Router();

// Inicializar OpenAI con tu API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generar SQL desde esquema (sin autenticación para desarrollo)
router.post('/generate', async (req, res) => {
  try {
    const { tables, description } = req.body;

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos una tabla' });
    }

    // Construir prompt para OpenAI
    const tablesDescription = tables.map(table => {
      const columns = table.columns.map(col => 
        `${col.name} ${col.type}${col.isPrimaryKey ? ' PRIMARY KEY' : ''}${col.isForeignKey ? ' FOREIGN KEY' : ''}`
      ).join(', ');
      
      return `Tabla "${table.name}": ${columns}`;
    }).join('\n');

    const prompt = `
Genera código SQL completo para crear una base de datos con las siguientes tablas:

${tablesDescription}

${description ? `Descripción adicional: ${description}` : ''}

Incluye:
1. Declaraciones CREATE TABLE con las restricciones apropiadas
2. Declaraciones ALTER TABLE para las claves foráneas
3. Algunos INSERT de datos de ejemplo
4. Comentarios explicativos en español

Responde SOLO con el código SQL, sin explicaciones adicionales.
`;

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en bases de datos SQL. Generas código SQL limpio, eficiente y bien documentado.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    });

    const sqlCode = completion.choices[0].message.content;

    console.log('✅ SQL generado exitosamente');

    res.json({
      success: true,
      sqlCode: sqlCode,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error generando SQL:', error);
    
    // Manejar errores específicos de OpenAI
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'Error de autenticación con OpenAI - Verificar API Key' });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Límite de API de OpenAI excedido, intenta más tarde' });
    }

    res.status(500).json({ error: 'Error generando SQL: ' + error.message });
  }
});

// Ruta para validar SQL (temporalmente sin autenticación)
router.post('/validate', async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'Código SQL requerido' });
    }

    // Aquí podrías implementar validación SQL básica
    // Por ahora, retornamos válido
    res.json({
      valid: true,
      message: 'SQL válido'
    });

  } catch (error) {
    console.error('Error validando SQL:', error);
    res.status(500).json({ error: 'Error validando SQL' });
  }
});

module.exports = router;
