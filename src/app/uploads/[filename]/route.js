import { NextResponse } from 'next/server';
import {readFile, access} from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  
  const resolvedParams = await params; 
  const { filename } = resolvedParams;

  if (!filename) {
    return NextResponse.json({ error: 'Nombre de archivo requerido' }, { status: 400 });
  }

  const safeFilename = path.basename(filename);

  if (safeFilename.startsWith('.')){
    return NextResponse.json({error: 'Acceso denegado a archivos de sistema'}, {status:403});
  }

  // 2. Buscamos el archivo FÍSICAMENTE en el disco (ignorando la caché de Next.js)
  const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

  try {
    await access(filePath);
    const fileBuffer = await readFile(filePath);

    const ext = path.extname(safeFilename).toLocaleLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';

    // 5. Devolvemos el archivo como respuesta directa
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="${safeFilename}"',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', // No cachear
      },
    });

  } catch (error) {
    if (error.code === 'ENOENT'){
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    console.error("Error sirviendo archivo:", error);
    return NextResponse.json({ error: 'Error interno al procesar archivo' }, { status: 500 });
  }
}