import { Schema, model, Document } from 'mongoose';

export interface IReporte extends Document {
  ubicacion: string;
  severidad: 'baja' | 'media' | 'crítica';
  descripcion: string;
  imagenUrl: string;
  estado: 'pendiente' | 'en reparación' | 'solucionado';
  reportadoPor: Schema.Types.ObjectId;
  votos: number;
  fecha: Date;
}

const ReporteSchema = new Schema<IReporte>({
  ubicacion: { type: String, required: true, trim: true },
  severidad: { 
    type: String, 
    enum: ['baja', 'media', 'crítica'], 
    required: true,
    default: 'baja'
  },
  descripcion: { type: String, required: true, trim: true },
  imagenUrl: { type: String, default: '' },
  estado: { 
    type: String, 
    enum: ['pendiente', 'en reparación', 'solucionado'], 
    default: 'pendiente' 
  },
  reportadoPor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  votos: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now }
});

export const Reporte = model<IReporte>('Reporte', ReporteSchema);
