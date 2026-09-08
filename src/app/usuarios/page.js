'use client';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import BotonEnviarCorreos from '@/components/BotonEnviarCorreos';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // --- ESTADOS PARA FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterModo, setFilterModo] = useState('Todos');
  const [filterPoder, setFilterPoder] = useState('Todos');

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const [loadingUsers, setLoadingUsers] = useState(false);

  const [tick, setTick] = useState(0);

  // Se modificó estado inicial limpio
  const [formData, setFormData] = useState({
    nombre: '',
    nombre_empresa: '',
    email: '',
    password: '',
    rol: 'User',
    es_habilitado: 1,
    modo_asistencia: 'Virtual',
    nombre_representante: ''
  });

  useEffect(() => {
    fetchUsuarios();
    const timerTick = setInterval(() => setTick(t => t + 1), 1000);
    const dataPoller = setInterval(fetchUsuarios, 5000);
    return () => {
      clearInterval(timerTick);
      clearInterval(dataPoller);
    };
  }, []);

  const fetchUsuarios = () => {
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => setUsuarios(data));
  };

  const getSessionDuration = (fechaLogin, estado) => {
    if (estado !== 'Online' || !fechaLogin) return null;
    const start = new Date(fechaLogin).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return "00:00:00";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const h = hours < 10 ? "0" + hours : hours;
    const m = minutes < 10 ? "0" + minutes : minutes;
    const s = seconds < 10 ? "0" + seconds : seconds;
    return `${h}:${m}:${s}`;
  };

  const onlineCount = usuarios.filter(u => u.estado === 'Online' && u.rol !== 'Admin').length;

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleLimpiarUsers = async () => {
    const confirmar = window.confirm(
      "⚠️ PELIGRO: ¿Estás seguro de ELIMINAR TODOS LOS USUARIOS INVITADOS? Las cuentas de administrador se mantendrán. Esta acción es irreversible."
    );

    // Doble Validación
    if (confirmar) {
      const segundaConfirmacion = window.confirm("¿Estas absolutamente seguro? Los usuarios ya no podrán acceder a la plataforma.");
      if (!segundaConfirmacion) return;

      setLoadingUsers(true);
      try {
        const res = await fetch("api/usuarios", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accion: "masivo" })
        });
        const data = await res.json();

        if (data.success) {
          alert("✅ " + data.message);
          // úede incluir función que recarga lista de users
        } else {
          alert("❌ Error: " + data.message);
        }
      } catch (error) {
        alert("❌ Ocurrió un error de conexión.");
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  // Se modificó valores de inicialización limpios al crear nuevo usuario
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nombre: '', nombre_empresa: '', email: '',
      password: '', rol: 'User',
      es_habilitado: 1, modo_asistencia: 'Virtual'
    });
    setShowModal(true);
  };

  // Se modificó carfa de datos limpia al mapear la edición
  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      nombre: user.nombre,
      nombre_empresa: user.nombre_empresa || '',
      email: user.email,
      password: '',
      rol: user.rol,
      es_habilitado: user.es_habilitado !== undefined ? user.es_habilitado : 1,
      modo_asistencia: user.modo_asistencia || 'Virtual',
      nombre_representante: user.nombre_representante || ''
    });
    setShowModal(true);
  };

  const handleViewProfile = (user) => {
    setSelectedProfile({
      userBasic: user,
      modo_asistencia: user.modo_asistencia || 'Virtual'
    });

    setShowProfileModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se modificó validación enfocada en Nombre o Empresa
    if (!formData.nombre.trim() && !formData.nombre_empresa.trim()) {
      alert("Debes ingresar al menos un Nombre o un Nombre de Empresa.");
      return;
    }
    setLoading(true);
    const method = editingId ? 'PUT' : 'POST';
    const bodyData = editingId ? { ...formData, id: editingId } : formData;
    try {
      const res = await fetch('/api/usuarios', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchUsuarios();
        setEditingId(null);
      } else {
        alert('Error al guardar');
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchUsuarios();
    } catch (error) { console.error(error); }
  };

  // --- NUEVAS FUNCIONES DE DESCONEXIÓN FORZADA ---
  const handleForceLogout = async (id, nombre, empresa) => {
    const identificador = nombre || empresa || 'este usuario';
    if (!confirm(`¿Estás seguro de forzar la desconexión de ${identificador}? Será expulsado inmediatamente.`)) return;

    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });
      if (res.ok) fetchUsuarios();
    } catch (error) { console.error(error); }
  };

  const handleForceLogoutAll = async () => {
    if (!confirm('🚨 ATENCIÓN 🚨\n\n¿Estás seguro de cerrar la sesión de TODOS los usuarios conectados inmediatamente? (Excepto administradores)')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout_all' })
      });
      if (res.ok) {
        alert('Sesiones cerradas. Los usuarios serán expulsados en un lapso de 5 segundos.');
        fetchUsuarios();
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleExport = () => {
    const dataToExport = usuarios.map(u => {
      return {
        nombre_representante: u.nombre,
        Nombre_Empresa: u.nombre_empresa || '',
        Email: u.email,
        Password: '',
        Rol: u.rol,
        Estado: u.es_habilitado ? 'Activo' : 'Inactivo',
        Modo: u.modo_asistencia || 'Virtual',

        // --- NUEVAS COLUMNAS (COMPLETAS) ---
        /*Representante_Legal_Asistencia: u.asistencia_representante || u.nombre || '',
        Celular_Contacto: u.contacto_celular || '',
        Persona_Que_Asiste: u.nombre_asistente || '',
        Cedula_Asistente: u.cedula_asistente || '',
        Celular_Asistente: u.contacto_asistente || '',
        Restricciones_Alimentarias: u.restricciones_alimentacion || '',
        Link_Poderes: linksPoder*/
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, "BaseDatos_Usuarios.xlsx");
  };

  const handleImportClick = () => { fileInputRef.current.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        const dataImported = XLSX.utils.sheet_to_json(ws);

        if (dataImported.length === 0) {
          alert("El archivo parece estar vacío");
          setImporting(false);
          return;
        }

        const res = await fetch('/api/usuarios/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataImported)
        });

        const result = await res.json();

        if (res.ok) {
          alert(`Importación exitosa.\nRegistrados: ${result.created || 'OK'}`);
          fetchUsuarios();
        } else {
          alert(`Error en la importación: ${result.error || 'Desconocido'}`);
        }

      } catch (error) {
        console.error("Error leyendo el archivo", error);
        alert("Error procesando el archivo Excel.");
      }
      setImporting(false);
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const nombre = (u.nombre || '').toLowerCase();
      const empresa = (u.nombre_empresa || '').toLowerCase();

      if (!nombre.includes(term) && !empresa.includes(term)) {
        return false;
      }
    }

    if (filterEstado !== 'Todos') {
      if (filterEstado === 'Online' && u.estado !== 'Online') return false;
      if (filterEstado === 'Offline' && u.estado === 'Online') return false;
    }
    if (filterModo !== 'Todos') {
      const modo = u.modo_asistencia || 'Virtual';
      if (filterModo === 'Virtual' && modo !== 'Virtual') return false;
      if (filterModo === 'Presencial' && modo !== 'Presencial') return false;
    }
    return true;
  });

  const usuariosParaCorreo = usuarios.filter(
    u => u.rol !== 'Admin' && u.rol !== 'admin' && (u.correo_enviado === 0 || !u.correo_enviado)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />

      {/* HEADER Y BOTONES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Gestión de Usuarios</h1>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${onlineCount > 0 ? 'bg-green-400' : 'bg-gray-300'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${onlineCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            </span>
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
              {onlineCount} {onlineCount === 1 ? 'conectado' : 'conectados'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* BOTÓN DESCONECTAR A TODOS */}
          {onlineCount > 0 && (
            <button onClick={handleForceLogoutAll} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all text-sm whitespace-nowrap flex-1 lg:flex-none justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              {loading ? 'Procesando...' : 'Desconectar Todos'}
            </button>
          )}

          <BotonEnviarCorreos usuarios={usuariosParaCorreo} />

          <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all text-sm whitespace-nowrap flex-1 lg:flex-none justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Exportar
          </button>
          <button onClick={handleImportClick} disabled={importing} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50 text-sm whitespace-nowrap flex-1 lg:flex-none justify-center">
            {importing ? <span>Cargando...</span> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Importar</>}
          </button>
          <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all ml-0 lg:ml-2 text-sm whitespace-nowrap flex-1 lg:flex-none justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Crear Usuario
          </button>
        </div>
      </div>

      {/* --- BARRA DE FILTROS Y BÚSQUEDA --- */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">

        <div className="flex-1 min-w-[200px] relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Buscar por Nombre, Empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase">Estado:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="Online">Online 🟢</option>
            <option value="Offline">Offline ⚫</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase">Modo:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterModo}
            onChange={(e) => setFilterModo(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="Virtual">Virtual 💻</option>
            <option value="Presencial">Presencial 📍</option>

          </select>
        </div>

        <div className="w-full lg:w-auto lg:ml-auto text-xs text-gray-400 text-right">
          {usuariosFiltrados.length} resultados
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[1000px] md:min-w-full">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold sticky top-0 z-10">
              <tr>
                <th className="p-4">Usuario / Empresa</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Perfil</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {usuariosFiltrados.map(u => {
                const sessionTime = getSessionDuration(u.ultimo_login, u.estado);
                const nombrePrincipal = u.nombre || u.nombre_empresa || 'Sin Nombre';
                const subtitulo = u.nombre && u.nombre_empresa ? u.nombre_empresa : null;
                const rowClass = u.es_habilitado === 0 ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50";

                return (
                  <tr key={u.id} className={`${rowClass} transition`}>
                    <td className="p-4 max-w-[250px] truncate">
                      <div className="font-bold text-gray-900 truncate" title={nombrePrincipal}>{nombrePrincipal}</div>
                      {subtitulo && <div className="text-xs text-gray-500 font-medium truncate" title={subtitulo}>{subtitulo}</div>}

                      {u.modo_asistencia && (
                        <div className="mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.modo_asistencia === 'Presencial' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                            {u.modo_asistencia}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-gray-600 max-w-[200px] truncate" title={u.email}>{u.email}</td>

                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.rol === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>{u.rol}</span>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${u.estado === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {u.estado || 'Offline'}
                      </span>
                      {u.estado === 'Online' && sessionTime && (
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">{sessionTime}</div>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button onClick={() => handleViewProfile(u)} className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto text-sm transition-transform hover:scale-105">
                        <span>Ver</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* BOTÓN INDIVIDUAL CERRAR SESIÓN */}
                        {u.estado === 'Online' && (
                          <button onClick={() => handleForceLogout(u.id, u.nombre, u.nombre_empresa)} className="text-orange-500 hover:bg-orange-50 p-2 rounded-full transition" title="Forzar Desconexión">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          </button>
                        )}

                        <button onClick={() => handleEdit(u)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(u.id, u.nombre, u.nombre_empresa)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>




        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleLimpiarUsers}
          disabled={loadingUsers}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loadingUsers ? "Eliminando..." : "⚠️ Eliminar Todos los Usuarios"}
        </button>
      </div>









      {/* MODAL EDITAR / CREAR (SE MODIFICÓ: NIT, COEFICIENTE Y CEDER PODER REMOVIDOS) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                <input type="text" name="nombre" placeholder="Nombre del participante" value={formData.nombre} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Empresa (Opcional)</label>
                <input type="text" name="nombre_empresa" placeholder="Empresa asociada" value={formData.nombre_empresa} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Contraseña</label>
                  <input type="text" name="password" placeholder={editingId ? "Mantener igual" : ""} value={formData.password} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select name="rol" value={formData.rol} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="User">Usuario</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Control de Evento</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo de Asistencia</label>
                  <select name="modo_asistencia" value={formData.modo_asistencia} onChange={handleChange} className="w-full border rounded px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Virtual">Virtual (Streaming Activo)</option>
                    <option value="Presencial">Presencial (Solo Interacción)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERFIL USUARIO DE ANDESCO */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Perfil del Asistente</h2>
                <p className="text-gray-500 text-sm">Información general del participante registrado</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div><p className="text-xs font-bold text-gray-400 uppercase">Nombre / Representante</p><p className="font-semibold text-gray-800 break-words">{selectedProfile.userBasic?.nombre || '-'}</p></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Empresa</p><p className="font-semibold text-gray-800 break-words">{selectedProfile.userBasic?.nombre_empresa || '-'}</p></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Email Corporativo</p><p className="font-semibold text-gray-800 break-words">{selectedProfile.userBasic?.email || '-'}</p></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Modalidad de Asistencia</p>
                <span className={`px-2 py-1 rounded text-xs font-bold ${selectedProfile.modo_asistencia === 'Presencial' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                  {selectedProfile.modo_asistencia || 'Virtual'}
                </span>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t flex justify-end">
              <button onClick={() => setShowProfileModal(false)} className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm shadow">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}