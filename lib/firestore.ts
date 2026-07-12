// @/lib/firestore.ts
import { getFirestore } from "firebase/firestore";
// Importamos la app ya inicializada desde tu archivo de configuración central
import { app } from "@/lib/firebase"; 

// Inicializamos Firestore de manera independiente reutilizando la app core
export const db = getFirestore(app);