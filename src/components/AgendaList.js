'use client';
import { useEffect, useState, useRef } from 'react';

export default function AgendaList() {
  const [puntos, setPuntos] = useState([]);
  const [nuevoPunto, setNuevoPunto] = useState('');
  const [user, setUser] = useState(null);
  
  // Estado para el Drag and Drop
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario_asamblea'));
    setUser(u);
    fetchOrden();
  }, []);

  const fetchOrden = () => {
    fetch('/api/orden')
      .then(res => res.json())
      .then(data => setPuntos(data));
  };

  const agregarPunto = async (e) => {
    e.preventDefault();
    if (!nuevoPunto.trim()) return;
    await fetch('/api/orden', {
      method: 'POST',
      body: JSON.stringify({ descripcion: nuevoPunto })
    });
    setNuevoPunto('');
    fetchOrden();
  };

  const toggleCompletado = async (id, estadoActual) => {
    if (!isAdmin) return;
    await fetch('/api/orden', {
      method: 'PUT',
      body: JSON.stringify({ id, completado: !estadoActual })
    });
    fetchOrden();
  };

  const eliminarPunto = async (id) => {
    if (!confirm('¿Eliminar este punto?')) return;
    await fetch('/api/orden', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    fetchOrden();
  };

  // --- LÓGICA DE DRAG & DROP ---
  const handleDragStart = (e, position) => {
      dragItem.current = position;
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e, position) => {
      e.preventDefault(); 
      dragOverItem.current = position;
      
      const listCopy = [...puntos];
      const dragItemContent = listCopy[dragItem.current];
      listCopy.splice(dragItem.current, 1);
      listCopy.splice(dragOverItem.current, 0, dragItemContent);
      
      dragItem.current = position; 
      setPuntos(listCopy);
  };

  const handleDragEnd = async () => {
      setIsDragging(false);
      dragItem.current = null;
      dragOverItem.current = null;

      if (isAdmin) {
          await fetch('/api/orden', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  action: 'reorder', 
                  items: puntos.map((p, index) => ({ id: p.id, posicion: index })) 
              })
          });
      }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Cargando agenda...</div>;
  const isAdmin = user.rol === 'Admin' || user.rol === 'admin';

  return (
    <div className="space-y-4">
      
      {/* FORMULARIO (SOLO ADMIN) */}
      {isAdmin && (
        <form onSubmit={agregarPunto} className="flex gap-2 bg-white p-4 rounded-lg shadow-sm border border-blue-100">
          <input 
            type="text" 
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            placeholder="Escribe un nuevo punto..."
            value={nuevoPunto}
            onChange={(e) => setNuevoPunto(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
            Agregar
          </button>
        </form>
      )}

      {/* LISTA DE PUNTOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {puntos.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
             <span className="text-4xl mb-2">📝</span>
             <p className="text-gray-400">No hay puntos definidos en la agenda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {puntos.map((punto, index) => (
              <li 
                key={punto.id} 
                className={`
                    p-4 flex items-center justify-between transition-all duration-200 group
                    ${punto.completado ? 'bg-gray-50' : 'bg-white hover:bg-blue-50'}
                    ${isDragging && dragItem.current === index ? 'opacity-50 bg-blue-100 scale-[0.98]' : 'opacity-100'}
                `}
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()} 
              >
                {/* Lado Izquierdo: Drag Handle, Checkbox y Texto */}
                <div className="flex items-center gap-4 flex-1">
                  
                  {isAdmin && (
                      <div className="cursor-grab text-gray-300 hover:text-blue-500 active:cursor-grabbing p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                      </div>
                  )}

                  <div 
                    onClick={() => toggleCompletado(punto.id, punto.completado)}
                    className={`
                      w-6 h-6 rounded flex items-center justify-center border cursor-pointer transition-all shrink-0
                      ${punto.completado ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-gray-300 text-transparent hover:border-blue-400'}
                      ${!isAdmin && 'cursor-default'} 
                    `}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  
                  <span className={`text-sm md:text-base ${punto.completado ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                    {punto.descripcion}
                  </span>
                </div>

                {/* Lado Derecho: Acciones (SOLO ADMIN) */}
                {isAdmin && (
                  <button 
                    onClick={() => eliminarPunto(punto.id)}
                    className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                    title="Eliminar punto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}