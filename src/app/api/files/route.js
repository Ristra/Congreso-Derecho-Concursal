import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pool } from '@/lib/db'; // <--- 1. IMPORTANTE: Importamos la conexión a la BD
// --- AGREGA ESTO OBLIGATORIAMENTE ---
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// -

const uploadDir = path.join(process.cwd(), 'public/uploads');

// 1. GET: Obtener lista de archivos físicos (para el panel de admin)
export async function GET() {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs.readdirSync(uploadDir);

    const fileStats = files.map(file => {
      const stats = fs.statSync(path.join(uploadDir, file));
      return {
        name: file,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        date: stats.mtime.toLocaleDateString() + ' ' + stats.mtime.toLocaleTimeString()
      };
    });

    return NextResponse.json(fileStats);
  } catch (error) {
    return NextResponse.json({ error: 'Error leyendo carpeta' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 });
    }

    const filePath = path.join(uploadDir, filename);

    // --- CAMBIO CLAVE: Bloque Try/Catch INDEPENDIENTE ---
    // Intentamos borrar el archivo físico. Si falla, NO detenemos el proceso.
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Archivo físico eliminado: ${filename}`);
      }
    } catch (fileError) {
      // Si falla (por permisos), solo lo avisamos en consola pero seguimos adelante
      console.warn(`No se pudo borrar el archivo físico (posible error de permisos), pero se borrará de la BD. Error: ${fileError.message}`);
    }
    // ----------------------------------------------------

    // PASO B: Borrar la referencia en la Base de Datos (Ahora sí se ejecutará siempre)
    await pool.query('DELETE FROM documentos WHERE filename = ?', [filename]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error general al eliminar:", error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}