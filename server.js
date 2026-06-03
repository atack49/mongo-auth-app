const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb://127.0.0.1:27017/userdb';

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB (userdb - BacheoAlert).'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Esquema de Usuario
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  specialty: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Esquema de Bache
const BacheSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  ubicacion: { type: String, required: true },
  severidad: { type: String, enum: ['Baja', 'Media', 'Alta'], required: true },
  descripcion: { type: String, required: true },
  estado: { type: String, enum: ['Reportado', 'En proceso', 'Reparado'], default: 'Reportado' },
  votos: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Bache = mongoose.model('Bache', BacheSchema);

// Rutas API de Autenticación
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, specialty, password } = req.body;
    if (!name || !email || !specialty || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const newUser = new User({ name, email, specialty, password });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito.',
      user: { name: newUser.name, email: newUser.email, specialty: newUser.specialty }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos.' });
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      user: { name: user.name, email: user.email, specialty: user.specialty }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// Rutas API de Baches
app.post('/api/baches', async (req, res) => {
  try {
    const { titulo, ubicacion, severidad, descripcion } = req.body;
    if (!titulo || !ubicacion || !severidad || !descripcion) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }

    const nuevoBache = new Bache({ titulo, ubicacion, severidad, descripcion });
    await nuevoBache.save();

    res.status(201).json({ success: true, message: 'Bache reportado con éxito.', bache: nuevoBache });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar el reporte.' });
  }
});

app.get('/api/baches', async (req, res) => {
  try {
    const baches = await Bache.find().sort({ votos: -1, createdAt: -1 });
    res.status(200).json({ success: true, baches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al recuperar los reportes.' });
  }
});

app.post('/api/baches/:id/votar', async (req, res) => {
  try {
    const { id } = req.params;
    const bache = await Bache.findByIdAndUpdate(id, { $inc: { votos: 1 } }, { new: true });
    if (!bache) {
      return res.status(404).json({ success: false, message: 'Bache no encontrado.' });
    }
    res.status(200).json({ success: true, message: 'Voto registrado.', bache });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar el voto.' });
  }
});

// Redireccionar raíz al Landing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de BacheoAlert CBTis 23 ejecutándose en http://localhost:${PORT}`);
});
