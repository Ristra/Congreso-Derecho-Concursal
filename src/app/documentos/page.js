'use client';
import { useState, useEffect } from 'react';

export default function DocumentosPage() {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar archivos al entrar
  const fetchFiles = async () => {
    const res = await fetch('/api/files');
    const data = await res.json();
    setArchivos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Función para borrar
  const handleDelete = async (filename) => {
    if (!confirm(`¿Seguro que quieres eliminar "${filename}" permanentemente?`)) return;

    const res = await fetch('/api/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });

    if (res.ok) {
      // Recargar lista sin refrescar pantalla
      fetchFiles();
    } else {
      alert('Error al eliminar archivo');
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando archivos...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Archivos en el Servidor</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          Total: {archivos.length}
        </span>
      </div>

      {archivos.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded border border-dashed">
          <p>📂 No hay documentos subidos actualmente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-sm uppercase">
                <th className="p-4 font-semibold">Nombre del Archivo</th>
                <th className="p-4 font-semibold">Peso</th>
                <th className="p-4 font-semibold">Fecha Subida</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {archivos.map((file) => (
                <tr key={file.name} className="hover:bg-gray-50 transition">
                  <td className="p-4 flex items-center gap-3 text-gray-700 font-medium">
                    <span className="text-2xl">📄</span> 
                    {/* Hacemos que sea un link para poder verlo/descargarlo */}
                    <a href={`/uploads/${file.name}`} target="_blank" className="hover:text-blue-600 hover:underline">
                      {file.name}
                    </a>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{file.size}</td>
                  <td className="p-4 text-gray-500 text-sm">{file.date}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded transition border border-red-200"
                      title="Eliminar archivo"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}