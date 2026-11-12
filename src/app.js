import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sequelize } from './config/database.js';

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).json({ message: 'API del blog funcionando' });
});

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a MySQL exitosa');
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
    }
};

iniciarServidor();