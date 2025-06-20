const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// const mongoose = require('mongoose');  // Comentado temporalmente
require('dotenv').config();

// const authRoutes = require('./routes/auth');      // Comentado temporalmente
const sqlRoutes = require('./routes/sql');
// const historyRoutes = require('./routes/history'); // Comentado temporalmente

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB (comentado temporalmente para desarrollo)
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sql_sketcher', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => {
//   console.log('✅ Conectado a MongoDB');
// })
// .catch((error) => {
//   console.error('❌ Error conectando a MongoDB:', error);
//   process.exit(1);
// });

console.log('⚠️ MongoDB deshabilitado temporalmente para desarrollo');

// Middlewares de seguridad
app.use(helmet());

// Configuración de CORS más robusta
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin 'origin' (como las de Postman o curl)
    // o si el origen está en la lista de permitidos.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP cada 15 minutos
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
});
app.use(limiter);

// Middleware para JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
// app.use('/api/auth', authRoutes);  // Comentado temporalmente hasta tener MongoDB
app.use('/api/sql', sqlRoutes);
// app.use('/api/history', historyRoutes);  // Comentado temporalmente hasta tener MongoDB

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SQL Sketcher Backend'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
