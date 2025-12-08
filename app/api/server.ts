import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import transacoesRoutes from "./routes/transacoes.js";
import cartoesRoutes from "./routes/cartoes.js";
import categoriasRoutes from "./routes/categorias.js";
import usuariosRoutes from "./routes/usuarios.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/transacoes", transacoesRoutes);
app.use("/api/cartoes", cartoesRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/usuarios", usuariosRoutes);

// Subir backend na porta 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
