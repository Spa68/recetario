export type FuentePlataforma = "instagram" | "facebook" | "youtube" | "whatsapp" | "web" | "manual";

export type Estado = "borrador" | "revisada";

export interface Ingrediente {
  nombre: string;
  cantidad_texto: string;
}

export interface Paso {
  orden: number;
  texto: string;
}

export interface Receta {
  id: string;
  user_id: string;
  titulo: string | null;
  texto_crudo: string;
  imagenes: string[]; // rutas dentro del bucket 'imagenes'
  fuente_plataforma: FuentePlataforma;
  fuente_url: string | null;
  etiquetas: string[];
  notas_personales: string | null;
  fecha_captura: string;
  estado: Estado;
  ingredientes: Ingrediente[];
  pasos: Paso[];
  created_at: string;
  updated_at: string;
}
