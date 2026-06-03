import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Reporte } from '../models/Reporte';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_bacheo_lerma_cetis23_2026';

// Interfaz para extender Request con la información del usuario de sesión
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Middleware de autenticación JWT
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
}

// GET '/api/reportes': Listar todos los reportes de baches con información del reportero
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const reportes = await Reporte.find()
      .populate('reportadoPor', 'name email role')
      .sort({ votos: -1, fecha: -1 });
    res.status(200).json({ success: true, reportes });
  } catch (error) {
    console.error('Error al listar reportes:', error);
    res.status(500).json({ success: false, message: 'Error al recuperar los reportes de baches.' });
  }
});

// POST '/api/reportes': Crear un nuevo reporte (Requiere autenticación)
router.post('/', authMiddleware as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ubicacion, severidad, descripcion, imagenUrl } = req.body;

    if (!ubicacion || !severidad || !descripcion) {
      res.status(400).json({ success: false, message: 'La ubicación, severidad y descripción son requeridas.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
      return;
    }

    const nuevoReporte = new Reporte({
      ubicacion,
      severidad,
      descripcion,
      imagenUrl: imagenUrl || '',
      reportadoPor: req.user.id
    });

    await nuevoReporte.save();

    res.status(201).json({
      success: true,
      message: 'Reporte registrado exitosamente en la base de datos de Lerma.',
      reporte: nuevoReporte
    });
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar el reporte.' });
  }
});

// PUT '/api/reportes/:id': Actualizar estado o incrementar votos de apoyo
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado, votar } = req.body;

    if (votar) {
      // Incrementar votos de apoyo al reporte para que la delegación de Lerma le dé prioridad
      const reporteActualizado = await Reporte.findByIdAndUpdate(
        id,
        { $inc: { votos: 1 } },
        { new: true }
      );
      if (!reporteActualizado) {
        res.status(404).json({ success: false, message: 'El reporte especificado no existe.' });
        return;
      }
      res.status(200).json({ success: true, message: 'Apoyo registrado al reporte.', reporte: reporteActualizado });
      return;
    }

    if (estado) {
      if (!['pendiente', 'en reparación', 'solucionado'].includes(estado)) {
        res.status(400).json({ success: false, message: 'Estado del reporte inválido.' });
        return;
      }

      const reporteActualizado = await Reporte.findByIdAndUpdate(
        id,
        { estado },
        { new: true }
      ).populate('reportadoPor', 'name email role');

      if (!reporteActualizado) {
        res.status(404).json({ success: false, message: 'El reporte especificado no existe.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Estado del bache actualizado con éxito.', reporte: reporteActualizado });
      return;
    }

    res.status(400).json({ success: false, message: 'Ninguna acción válida provista (estado o votar).' });
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    res.status(500).json({ success: false, message: 'Error interno al intentar actualizar el reporte.' });
  }
});

export default router;
