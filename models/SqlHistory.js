const mongoose = require('mongoose');

const sqlHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  tables: [{
    name: {
      type: String,
      required: true
    },
    columns: [{
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      isPrimaryKey: {
        type: Boolean,
        default: false
      },
      isForeignKey: {
        type: Boolean,
        default: false
      },
      isRequired: {
        type: Boolean,
        default: false
      }
    }]
  }],
  sqlCode: {
    type: String,
    required: true
  },
  openaiUsage: {
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
sqlHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para optimizar consultas
sqlHistorySchema.index({ userId: 1, createdAt: -1 });
sqlHistorySchema.index({ isPublic: 1, createdAt: -1 });
sqlHistorySchema.index({ tags: 1 });

module.exports = mongoose.model('SqlHistory', sqlHistorySchema);
