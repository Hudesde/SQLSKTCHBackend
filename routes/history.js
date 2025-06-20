const express = require('express');
const authMiddleware = require('../middleware/auth');
const SqlHistory = require('../models/SqlHistory');

const router = express.Router();

// Obtener historial del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const history = await SqlHistory.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-sqlCode'); // No incluir el código SQL completo en la lista

    const total = await SqlHistory.countDocuments({ userId: req.userId });

    res.json({
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un SQL específico del historial
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const sqlHistory = await SqlHistory.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!sqlHistory) {
      return res.status(404).json({ error: 'SQL no encontrado' });
    }

    res.json(sqlHistory);

  } catch (error) {
    console.error('Error obteniendo SQL:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar nombre/descripción de un SQL
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, tags } = req.body;

    const sqlHistory = await SqlHistory.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...(name && { name }),
        ...(description && { description }),
        ...(tags && { tags }),
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!sqlHistory) {
      return res.status(404).json({ error: 'SQL no encontrado' });
    }

    res.json(sqlHistory);

  } catch (error) {
    console.error('Error actualizando SQL:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un SQL del historial
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const sqlHistory = await SqlHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!sqlHistory) {
      return res.status(404).json({ error: 'SQL no encontrado' });
    }

    res.json({ message: 'SQL eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando SQL:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas del usuario
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const totalGenerated = await SqlHistory.countDocuments({ userId: req.userId });
    
    const stats = await SqlHistory.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: null,
          totalSqls: { $sum: 1 },
          totalTokens: { $sum: '$openaiUsage.totalTokens' },
          avgTokens: { $avg: '$openaiUsage.totalTokens' }
        }
      }
    ]);

    res.json({
      totalGenerated,
      totalTokens: stats[0]?.totalTokens || 0,
      avgTokens: Math.round(stats[0]?.avgTokens || 0),
      lastGenerated: await SqlHistory.findOne(
        { userId: req.userId },
        { createdAt: 1 }
      ).sort({ createdAt: -1 })
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
