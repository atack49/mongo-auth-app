import express, { Request, Response } from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userdb';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Conexión a MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB.'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Interfaz para el Usuario
interface IUser extends Document {
  name: string;
  email: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model<IUser>('User', UserSchema);

// Interfaz para el Reporte de Bache
interface IBache extends Document {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  gravedad: 'Baja' | 'Media' | 'Alta';
  estado: 'Reportado' | 'En proceso' | 'Reparado';
  votos: number;
  reportadoPor: string; // Email del estudiante/vecino
  createdAt: Date;
}

const BacheSchema: Schema = new Schema({
  titulo: { type: String, required: true, trim: true },
  descripcion: { type: String, required: true },
  ubicacion: { type: String, required: true },
  gravedad: { type: String, enum: ['Baja', 'Media', 'Alta'], default: 'Baja' },
  estado: { type: String, enum: ['Reportado', 'En proceso', 'Reparado'], default: 'Reportado' },
  votos: { type: Number, default: 0 },
  reportadoPor: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Bache = mongoose.model<IBache>('Bache', BacheSchema);

// Endpoint API para registrar/ingresar usuarios
app.post('/api/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'El nombre y el correo son requeridos.' });
      return;
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(200).json({ 
        success: true, 
        message: 'Acceso exitoso.', 
        user: { name: existingUser.name, email: existingUser.email } 
      });
      return;
    }

    // Crear y guardar el nuevo usuario (estudiante/vecino)
    const newUser = new User({ name, email });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito.',
      user: { name: newUser.name, email: newUser.email }
    });
  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// Endpoint API para crear un reporte de bache
app.post('/api/baches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { titulo, descripcion, ubicacion, gravedad, reportadoPor } = req.body;

    if (!titulo || !descripcion || !ubicacion || !reportadoPor) {
      res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el reporte.' });
      return;
    }

    const nuevoBache = new Bache({
      titulo,
      descripcion,
      ubicacion,
      gravedad: gravedad || 'Baja',
      reportadoPor
    });

    await nuevoBache.save();

    res.status(201).json({
      success: true,
      message: 'Reporte de bache creado con éxito.',
      bache: nuevoBache
    });
  } catch (error: any) {
    console.error('Error al crear bache:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el reporte de bache.' });
  }
});

// Endpoint API para obtener todos los reportes de baches
app.get('/api/baches', async (req: Request, res: Response): Promise<void> => {
  try {
    const baches = await Bache.find().sort({ votos: -1, createdAt: -1 });
    res.status(200).json({ success: true, baches });
  } catch (error: any) {
    console.error('Error al obtener baches:', error);
    res.status(500).json({ success: false, message: 'Error al recuperar los reportes de baches.' });
  }
});

// Endpoint API para votar por un bache
app.post('/api/baches/:id/votar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bacheActualizado = await Bache.findByIdAndUpdate(
      id,
      { $inc: { votos: 1 } },
      { new: true }
    );

    if (!bacheActualizado) {
      res.status(404).json({ success: false, message: 'Reporte de bache no encontrado.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Voto registrado exitosamente.',
      bache: bacheActualizado
    });
  } catch (error: any) {
    console.error('Error al votar por el bache:', error);
    res.status(500).json({ success: false, message: 'Error al procesar el voto.' });
  }
});

// Redireccionar la raíz a register.html
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
