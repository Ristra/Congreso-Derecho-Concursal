import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { pool } from '@/lib/db';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Limpiamos el nombre de espacios para evitar errores en URLs
    const safeName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    
    // Ruta absoluta a la carpeta public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // IMPORTANTE: Esto crea la carpeta si no existe (soluciona el error 500)
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    
    // Escribir el archivo
    await writeFile(filePath, buffer);
    console.log(`Archivo guardado en: ${filePath}`);

    // Guardar en BD
    await pool.query('INSERT INTO documentos (nombre, filename) VALUES (?, ?)', [file.name, fileName]);

    return NextResponse.json({ success: true, fileName });

  } catch (error) {
    console.error("ERROR EN UPLOAD:", error); // Esto saldrá en tu terminal de VS Code
    return NextResponse.json({ error: "Error interno al subir archivo" }, { status: 500 });
  }
}