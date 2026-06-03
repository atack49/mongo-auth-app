import express, { Request, Response } from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import reportesRouter from './routes/reportes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bacheo_cetis23';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_bacheo_lerma_cetis23_2026';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Conexión a MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB (Lerma Bacheo).'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Interfaz para el Usuario
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'estudiante' | 'vecino' | 'transportista';
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['estudiante', 'vecino', 'transportista'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);

// Rutas de Autenticación
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
      return;
    }

    if (!['estudiante', 'vecino', 'transportista'].includes(role)) {
      res.status(400).json({ success: false, message: 'Rol de usuario inválido.' });
      return;
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
      return;
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear y guardar el nuevo usuario
    const newUser = new User({ name, email, passwordHash, role });
    await newUser.save();

    // Generar token JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito en Lerma.',
      token,
      user: { name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al registrar.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Correo y contraseña requeridos.' });
      return;
    }

    // Buscar al usuario
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'Credenciales incorrectas.' });
      return;
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Credenciales incorrectas.' });
      return;
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: { name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar sesión.' });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token no provisto.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token no válido o expirado.' });
  }
});

// Rutas de Reportes
app.use('/api/reportes', reportesRouter);

// Redireccionar raíz al Landing (index.html)
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de Bacheo CETis 23 ejecutándose en http://localhost:${PORT}`);
});
