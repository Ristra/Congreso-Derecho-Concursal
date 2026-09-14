'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import QAPanel from '@/components/QAPanel';
import Patrocinadores from '@/components/Patrocinadores';

const BotonReporteFinal = dynamic(() => import('@/components/BotonReporteFinal'), { ssr: false });

export default function SalaVirtual() {
  const [user, setUser] = useState(null);
  const isAdmin = user?.rol?.toLowerCase() === 'admin';
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [iniciarVideo, setIniciarVideo] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('qa'); // Pestañas: 'QA', 'Config', 'Votaciones'
  const [activeViewTab, setActiveViewTab] = useState('preguntas');  // Controla chat vs Documentos para todos

  const [loadingMensajes, setLoadingMensajes] = useState(false);

  const [data, setData] = useState({
    quorum: 0,
    base: 100,
    video: '',
    googleForm: '',
    enlaceAuxiliar: '',
    youtubeControls: 1,
    documents: [],
    activePoll: null,
    results: { total: 0, opciones: {} },
    projectedPoll: null,
    projectedResults: { total: 0, opciones: {} },
    userPower: 0,
    representadosNombres: [],
    userInfo: { es_habilitado: 1, modo_asistencia: 'Virtual' },
    asambleaActiva: null
  });

  const [baseInput, setBaseInput] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [googleFormInput, setGoogleFormInput] = useState('');
  const [enlaceAuxiliarInput, setEnlaceAuxiliarInput] = useState('');

  const [pollPregunta, setPollPregunta] = useState('');
  const [pollOpciones, setPollOpciones] = useState('');
  const [pollType, setPollType] = useState('sino');
  const [pollCargos, setPollCargos] = useState('');

  const [file, setFile] = useState(null);
  const [finalReportData, setFinalReportData] = useState(null);
  const [textoVoto, setTextoVoto] = useState('');

  const categoriasTexto = ['✅ Aprobación', '👏 Felicitación', '📝 Comentario', '⚠️ Queja/Reclamo', '🙋 Idea'];
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  const [mostrarModalInicio, setMostrarModalInicio] = useState(false);
  const [datosInforme, setDatosInforme] = useState({
    cliente_empresa: '',
    nombre_evento: '',
    fecha_evento_texto: ''
  });

  const confirmarInicioEvento = async (e) => {
    // 1. Bloqueamos cualquier recarga fantasma del navegador
    if (e) e.preventDefault();

    // 2. Armamos el paquete explícitamente antes de enviarlo
    const paqueteDeDatos = {
      action: 'start_assembly',
      cliente_empresa: datosInforme.cliente_empresa,
      nombre_evento: datosInforme.nombre_evento,
      fecha_evento_texto: datosInforme.fecha_evento_texto
    };

    console.log("ENVIANDO AL BACKEND:", paqueteDeDatos); // <-- Revisar en consola del navegador

    try {
      const res = await fetch('/api/asamblea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(paqueteDeDatos)
      });

      console.log("RESPUESTA STATUS:", res.status);

      if (res.ok) {
        alert("¡Evento iniciado con éxito y datos guardados!");
        setMostrarModalInicio(false);

        // window.location.reload(); 
      } else {
        const errorData = await res.json();
        alert("Error del servidor: " + (errorData.error || 'Desconocido'));
      }
    } catch (error) {
      console.error("Fallo de red:", error);
    }
  };

  /*const startAssembly = async () => {
    if (!confirm('¿Estás seguro de INICIAR el Evento? Esto marcará la hora de inicio oficial.')) return;
    const res = await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'start_assembly' })
    });
    if (res.ok) alert('Evento Iniciado Correctamente');
  };*/

  useEffect(() => {
    let currentUserId = null;
    if (typeof window !== 'undefined') {
      const u = JSON.parse(localStorage.getItem('usuario_asamblea'));
      setUser(u);
      currentUserId = u?.id;
    }

    const fetchData = () => {
      const idToSend = currentUserId || user?.id;
      const url = idToSend ? `/api/asamblea?userId=${idToSend}` : '/api/asamblea';

      fetch(url)
        .then(res => res.json())
        .then(resData => {
          setData(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(resData)) {
              return resData;
            }
            return prev;
          });
        })
        .catch(err => console.error("Error fetching data:", err));
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateBase = async () => {
    if (!baseInput) return;
    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_config', base: baseInput })
    });
    alert('Base de Quórum Actualizada');
    setBaseInput('');
  };

  const updateVideo = async () => {
    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_config', video: videoInput })
    });
    alert('Link de transmisión actualizado');
    setVideoInput('');
  };

  const updateGoogleForm = async () => {
    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_config', google_form: googleFormInput })
    });
    alert('Formulario de Google actualizado.');
    setGoogleFormInput('');
  };

  const updateEnlaceAuxiliar = async () => {
    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_config', enlace_auxiliar: enlaceAuxiliarInput })
    });
    alert('Enlace auxiliar (Meet/Zoom) actualizado.');
    setEnlaceAuxiliarInput('');
  };

  const endAssembly = async () => {
    if (!confirm('¿FINALIZAR el Evento? Se cerrará el registro y se generará el informe final.')) return;
    const res = await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'end_assembly' })
    });
    const json = await res.json();
    if (json.success) {
      setFinalReportData(json);
      alert('Evento Finalizado. Descarga el informe abajo.');
    }
  };
  const recuperarDatosDelInforme = async () => {
    // 1. Preguntamos para confirmar
    if (!confirm('¿Deseas extraer los datos del backup local para generar el PDF?')) return;

    try {
      // 2. Llamamos a nuestro nuevo endpoint
      const res = await fetch('/api/asamblea/recuperar-informe', {
        method: 'GET'
      });

      const json = await res.json();

      // 3. Si todo sale bien, inyectamos los datos para que el PDF despierte
      if (json.success) {
        setFinalReportData(json);
        alert('¡Datos recuperados con éxito! El PDF se está generando...');
      } else {
        alert('Hubo un problema recuperando los datos: ' + (json.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error("Error al recuperar el informe:", error);
      alert('Error de conexión con el servidor local.');
    }
  }


  const uploadFile = async () => {
    if (!file) return alert("Selecciona un archivo primero");
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        alert("Archivo subido correctamente");
        setFile(null);
        document.getElementById('fileInput').value = "";
      } else {
        alert("Error al subir");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red");
    }
  };

  const deleteDocument = async (filename) => {
    if (!confirm('¿Estás seguro de eliminar este archivo definitivamente?')) return;
    try {
      const res = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) alert("Archivo eliminado correctamente");
    } catch (e) {
      console.error(e);
    }
  };

  const createPoll = async () => {
    let opciones = [];
    if (pollType === 'sino') {
      opciones = ['Si', 'No'];
    } else if (pollType === 'abierta') {
      opciones = ['__TEXTO_LIBRE__'];
    } else if (pollType === 'escala') {
      const max = parseInt(pollOpciones) || 5;
      opciones = Array.from({ length: max }, (_, i) => (i + 1).toString());
    } else {
      opciones = pollOpciones.split(',').map(s => s.trim()).filter(s => s !== '');
    }

    if (pollType !== 'abierta' && opciones.length < 2) return alert('Mínimo 2 opciones.');
    if (!pollPregunta) return alert('Escribe una pregunta');

    if (pollType === 'planchas' && (!pollCargos || pollCargos < 1)) {
      return alert('Para votación por planchas, debes indicar el número de cargos a proveer.');
    }

    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_poll',
        pregunta: pollPregunta,
        opciones,
        type: pollType,
        cargos: pollCargos || 0
      })
    });

    setPollPregunta('');
    setPollOpciones('');
    setPollCargos('');
    alert('Votación iniciada correctamente');
  };

  const closePoll = async () => {
    if (!confirm('¿Cerrar votación?')) return;
    await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({ action: 'close_poll' })
    });
    setTextoVoto('');
    setCategoriaSeleccionada('');
  };

  const votar = async (respuesta) => {
    if (!respuesta || respuesta.trim() === '') return alert("Respuesta vacía");

    let votoFinal = respuesta;
    if (data.activePoll.type === 'abierta') {
      if (!categoriaSeleccionada) return alert("Por favor selecciona el tipo de intervención antes de enviar.");
      votoFinal = `[${categoriaSeleccionada}] ${respuesta}`;
    }

    const res = await fetch('/api/asamblea', {
      method: 'POST',
      body: JSON.stringify({
        action: 'vote',
        pollId: data.activePoll.id,
        userId: user.id,
        respuesta: votoFinal
      })
    });
    const json = await res.json();
    if (json.error) alert(json.error);
    else {
      alert('Voto registrado exitosamente');
      setTextoVoto('');
      setCategoriaSeleccionada('');
    }
  };

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const toggleChatMode = async () => {
    // Cambia de privado '1' a público '0' y viceversa
    const nuevoModo = data.chatPrivado === 1 ? 0 : 1;

    setData(prevData => ({
      ...prevData,
      chatPrivado: nuevoModo
    }));
    try {
      await fetch('api/asamblea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', chat_privado: nuevoModo })
      });
    } catch (error) {
      console.error("Error cambiando el modo del chat:", error);
    }
  };

  const renderVideoContent = () => {
    const url = data.video;
    const isUser = user && user.rol !== 'Admin' && user.rol !== 'admin';
    //const isPresencial = data.userInfo.modo_asistencia === 'Presencial';

    {/*if (isUser && isPresencial) {
      return (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-center p-6">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Asistencia Presencial</h3>
          <p className="text-gray-600 max-w-md text-sm md:text-base">Has registrado tu asistencia como presencial. Por favor presta atención a la pantalla principal del auditorio.</p>
        </div>
      );
    }*/}

    if (!url) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 bg-zinc-900">
          <div className="mb-4 text-4xl md:text-6xl">🏛️</div>
          <p className="text-white text-base md:text-lg font-medium">Evento Virtual</p>
          <p className="text-gray-500 text-xs md:text-sm">Esperando inicio de transmisión...</p>
        </div>
      );
    }

    const showControls = data.youtubeControls === 1 ? 1 : 0;

    if (url.includes('zoom.us') || url.includes('zoom.com') || url.includes('meet.google')) {
      const isZoom = url.includes('zoom');
      return (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-lg ${isZoom ? 'bg-blue-500' : 'bg-green-500'}`}>
            {isZoom ? '📷' : '📞'}
          </div>
          <h3 className="text-xl font-bold mb-2">{isZoom ? 'Reunión vía Zoom' : 'Reunión vía Google Meet'}</h3>
          <a href={url} target="_blank" rel="noopener noreferrer" className={`px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 ${isZoom ? 'bg-blue-600' : 'bg-green-600'}`}>
            Unirse a la Reunión
          </a>
        </div>
      );
    }

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = getYouTubeId(url);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=${showControls}`}
            className="w-full h-full absolute top-0 left-0"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    {/*}
    if (url.includes('vimeo.com')) {
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/|event\/)?(\d+)/);
      const vimeoId = vimeoMatch ? vimeoMatch[1] : null;

      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&controls=${showControls}&title=0&byline=0&portrait=0`}
            className="w-full h-full absolute top-0 left-0"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }*/}

    if (url.includes('vimeo.com')) {
      // 1. Verificamos si es un evento en vivo
      const isEvent = url.includes('/event/');

      // 2. Extraemos el ID del video o del evento
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/|event\/)?(\d+)/);
      const vimeoId = vimeoMatch ? vimeoMatch[1] : null;

      if (vimeoId) {
        if (!iniciarVideo) {
          return (
            <div className="absolute inset-0 bg-zinc-900/90 flex flex-col items-center justify-center text-white p-6 z-10 backdrop-blur-sm">
              <div
                onClick={() => setIniciarVideo(true)}
                className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mb-6 text-4xl shadow-lg cursor-pointer hover:scale-110 hover:bg-blue-500 transition-all duration-300"
              >
                ▶️
              </div>
              <h3 className="text-2xl font-bold mb-2">La transmisión está lista</h3>
              <p className="text-gray-400 text-sm mb-8">Haz clic para unirte</p>
            </div>
          );
        }
        // 3. Construimos la URL correcta según el tipo
        const iframeSrc = isEvent
          ? `https://vimeo.com/event/${vimeoId}/embed?autoplay=1&muted=0&controls=${showControls}`
          : `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&controls=${showControls}&title=0&byline=0&portrait=0`;

        return (
          <iframe
            src={iframeSrc}
            className="w-full h-full absolute top-0 left-0"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    return <iframe src={url} className="w-full h-full absolute top-0 left-0" allowFullScreen />;
  };

  if (!user) return <div className="p-20 text-center text-gray-500 font-medium">Cargando panel de asamblea...</div>;

  //const isEnabled = data.userInfo.es_habilitado === 1;

  const handleLimpiarMensajes = async () => {
    const confirmar = window.confirm(
      "⚠️ ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR TODOS LOS MENSAJES? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    setLoadingMensajes(true);
    try {
      const res = await fetch("api/qa", { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        alert("✅ Bandeja de mensajes limpiada con éxito.")
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (error) {
      alert("❌ Ocurrió un error en la conexión.");
    } finally {
      setLoadingMensajes(false);
    }
  };

  const camposCompletos =
    datosInforme.cliente_empresa.trim() !== '' &&
    datosInforme.nombre_evento.trim() !== '' &&
    datosInforme.fecha_evento_texto.trim() !== '';

  const renderPanelInteractivo = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg flex flex-col h-[500px] md:h-[600px] w-full border border-gray-200">

      {/* CABECERA PESTAÑAS */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveViewTab('preguntas')}
          className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeViewTab === 'preguntas' ? 'text-blue-700 border-b-2 border-blue-700 bg-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setActiveViewTab('documentos')}
          className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeViewTab === 'documentos' ? 'text-blue-700 border-b-2 border-blue-700 bg-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
          📄 Agenda
        </button>
      </div>

      {/* ---CONTENIDO DINÁMICO--- */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* VISTA 1: CHAT */}
        {activeViewTab === 'preguntas' && (
          <div className="h-full">
            <QAPanel usuario={user} isAdmin={isAdmin} data={data} />
          </div>
        )}

        {/* VISTA 2: DOCUMENTOS PDF */}
        {activeViewTab === 'documentos' && (
          <div className="h-full p-4 flex flex-col bg-gray-50">
            {data?.urlPdf ? (
              <>
                <div className="flex-1 w-full rounded border border-gray-200 overflow-hidden shadow-sm">
                  <iframe
                    src={`${data.urlPdf}#view=FitH&toolbar=0`}
                    className="w-full h-full bg-white"
                    title="Agenda"
                  />
                </div>
                <a
                  href={data.urlPdf}
                  download
                  target="_blank"
                  className="mt-3 block text-center py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-bold hover:bg-blue-200 transition"
                >
                  📥 Descargar PDF
                </a>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm font-medium">La agenda estará disponible pronto.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );


  return (
    <div
      className="min-h-[100dvh] w-full m-0 overflow-x-hidden flex flex-col items-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundPosition: "center 0%",
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)), url('/fondo-opcion2.jpg')"
      }}
    >
    <div className={`mx-auto space-y-6 pb-20 p-4 transition-all duration-700 ${isTheaterMode ? 'max-w-[98%]' : 'max-w-7xl'}`}>

      {/* HEADER: Título y Datos del Usuario */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        {/*<h1 className="text-xl md:text-2xl font-bold text-white">Sala del Evento</h1>*/}
        {!isAdmin && user && (
          <div className="text-right w-full md:w-auto">
            {/*<p className="text-sm font-bold text-gray-700 mb-1">{user.nombre || user.nombre_empresa}</p>*/}
            <div className="flex flex-wrap items-center justify-end gap-2">

              {data.representadosNombres && data.representadosNombres.length > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200 font-bold max-w-[200px] truncate shadow-sm" title={data.representadosNombres.join(', ')}>
                  Poder de: {data.representadosNombres.join(', ')}
                </span>
              )}
              {/*<span className={`text-xs px-2 py-0.5 rounded-full border font-bold shadow-sm ${data.userInfo.modo_asistencia === 'Presencial' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                {data.userInfo.modo_asistencia}
              </span>*/}
            </div>
          </div>
        )}
      </div>

      {/* GRID INTELIGENTE: Cambia de forma sin recargar componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">

        {/* 1. EL VIDEO (Se estira a 3 columnas en modo cine) */}
        <div className={`relative w-full bg-black rounded-xl overflow-hidden mt-20 shadow-2xl transition-all duration-700 lg:row-start-1 lg:col-start-1 ${isTheaterMode ? 'lg:col-span-3 aspect-video md:aspect-[21/9] max-h-[85vh]' : 'lg:col-span-2 aspect-video'}`}>
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg backdrop-blur-md transition-all shadow-lg border border-white/20 flex items-center gap-2 text-sm font-medium"
            title="Modo Cine"
          >
            {isTheaterMode ? '🗗' : '🎞️'}
          </button>
          {renderVideoContent()}
        </div>

        <div className="w-full lg:col-span-2"><Patrocinadores /></div>


        {/* ---SECCIÓN DISPONIBLE PARA LOGOS--- */}


        {/* 3. COLUMNA DERECHA (Admin / Usuario y CHAT) */}
        <div className={`space-y-6 lg:col-start-3 ${isTheaterMode ? 'lg:row-start-2' : 'lg:row-start-1 lg:row-span-2'}`}>
          <div className={`transition-all duration-500 space-y-6 lg:col-start-3 lg:col-span-1 ${isTheaterMode ? 'lg:row-start-2' : 'lg:row-start-1 lg:row-span-2'}`}>
            {isAdmin ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">⚡ Gestión Admin</h3>
                  <span className="text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded font-bold tracking-wide">CONTROL</span>
                </div>

                {/* SISTEMA DE PESTAÑAS */}
                <div className="flex border-b border-gray-200 bg-gray-50 text-[11px] uppercase font-bold tracking-wider text-gray-500">
                  <button
                    onClick={() => setActiveAdminTab('qa')}
                    className={`flex-1 py-3 flex justify-center items-center gap-1.5 transition-all ${activeAdminTab === 'qa' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-sm' : 'hover:bg-gray-100 hover:text-gray-700'}`}
                  >
                    <span className="text-sm">💬</span> Chat
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('agenda')}
                    className={`flex-1 py-3 flex justify-center items-center gap-1.5 transition-all ${activeAdminTab === 'agenda' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600 shadow-sm' : 'hover:bg-gray-100 hover:text-gray-700'}`}
                  >
                    <span className="text-sm">📄</span> Agenda
                  </button>
                  <button
                    onClick={() => setActiveAdminTab('config')}
                    className={`flex-1 py-3 flex justify-center items-center gap-1.5 transition-all ${activeAdminTab === 'config' ? 'bg-white text-gray-900 border-b-2 border-gray-900 shadow-sm' : 'hover:bg-gray-100 hover:text-gray-700'}`}
                  >
                    <span className="text-sm">⚙️</span> Sala
                  </button>
                </div>

                {/* CONTENEDOR PESTAÑA ACTIVA */}
                <div className="p-5">

                  {/* PESTAÑA 1: MODERACION Q&A */}

                  {activeAdminTab === 'qa' && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm mb-4 transition-all">
                        <div>
                          <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            {data.chatPrivado === 1 ? '🔒 MODO Q&A: PRIVADO' : '🌍 MODO Q&A: PÚBLICO'}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-tight"> {/* text-xs text-gray-500 mt-1 max-w-[200px] leading-tight*/}
                            {data.chatPrivado === 1
                              ? 'Los usuarios solo ven sus propias preguntas. Recomendado'
                              : 'Todos pueden leer las preguntas de los demás.'}
                          </p>
                        </div>

                        {/* SWITCH */}
                        <button
                          onClick={toggleChatMode}
                          type="button"
                          className={`${data.chatPrivado === 1 ? 'bg-indigo-600' : 'bg-gray-300'
                            } relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner`}
                          roles="switch"
                          aria-checked={data.chatPrivado === 1}
                        >
                          <span className="sr-only">Alternar modo de chat</span>
                          <span
                            aria-hidden="true"
                            className={`${data.chatPrivado === 1 ? 'translate-x-5' : 'translate-x-0'
                              } pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out`}
                          />
                        </button>

                      </div>
                      <div className={`transition-all duration-500 ${isTheaterMode ? 'fixed bottom-4 right-4 z-[70] w-[90vw] md:w-[350px] h-[40vh] md:h-[70vh] shadow-2xl opacity-40 hover:opacity-100 transition-opacity rounded-xl overflow-hidden border border-gray-300 bg-white/95 backdrop-blur-md' : 'w-full opacity-100'}`}>
                        {isTheaterMode && <div className="bg-indigo-600 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest shadow-sm cursor-pointer">Chat en Vivo (Acerca el cursor)</div>}
                        <QAPanel usuario={user} isAdmin={isAdmin} data={data} />
                      </div>
                      <button
                        onClick={handleLimpiarMensajes}
                        disabled={loadingMensajes}
                        className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
                      >
                        {loadingMensajes ? "Borrando..." : "🗑️ Eliminar Preguntas"}
                      </button>
                    </div>
                  )}

                  {/* PESTAÑA 2: Agenda */}

                  {activeAdminTab === 'agenda' && (
                    <div className="h-[500px] md:h-[600px] flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-200 animate-fade-in-up">
                      {data?.urlPdf ? (
                        <>
                          <div className="flex-1 w-full rounded border border-gray-200 overflow-hidden shadow-sm">
                            <iframe
                              src={`${data.urlPdf}#view=FitH&toolbar=0`}
                              className="w-full h-full bg-white"
                              title="Agenda"
                            />
                          </div>
                          <a
                            href={data.urlPdf}
                            download
                            target="_blank"
                            className="mt-3 block text-center py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-bold hover:bg-blue-200 transition"
                          >
                            📥 Descargar PDF
                          </a>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <p className="text-sm font-medium">La agenda estará disponible pronto.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PESTAÑA 3: CONFIGURACION DE SALA */}

                  {activeAdminTab === 'config' && (
                    <div className="space-y-4 animate-fade-in-up">
                      {/* 1. Control de sesión */}
                      <div className="p-5 space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Control de Sesión</h4>
                          {data.asambleaActiva ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-2 rounded">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Evento en curso
                              </div>
                              <button onClick={endAssembly} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 shadow-md transition">Finalizar Evento</button>
                            </div>
                          ) : (
                            <button onClick={() => setMostrarModalInicio(true)} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-md transition">Iniciar Evento</button>
                          )}

                          {/* POP-UP PARA INICIAR EVENTO */}
                          {mostrarModalInicio && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <div className="bg-white p-6 rounded-lg w-[500px] shadow-xl">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">Datos para el Informe Final</h2>
                                <p className="text-sm text-gray-600 mb-4">Ingresa la información del cliente para automatizar el informe ejecutivo del evento</p>

                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Cliente o Empresa</label>
                                    <input type="text"
                                      className="mt-1 w-full border rounded p-2"
                                      placeholder="Ej.  ASOCIACIÓN NACIONAL DE EMPRESAS DE SERVICIOS PÚBLICOS Y COMUNICACIONES-ANDESCO"
                                      value={datosInforme.cliente_empresa}
                                      onChange={(e) => setDatosInforme({ ...datosInforme, cliente_empresa: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre del Evento</label>
                                    <input type="text"
                                      className="mt-1 w-full border rounded p-2"
                                      placeholder="Ej. 3° Seminario de Oficiales de Cumplimiento"
                                      value={datosInforme.nombre_evento}
                                      onChange={(e) => setDatosInforme({ ...datosInforme, nombre_evento: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha del Evento (Formato Texto)</label>
                                    <input type="text"
                                      className="mt-1 w-full border rounded p-2"
                                      placeholder="Ej. 30 de Julio de 2026"
                                      value={datosInforme.fecha_evento_texto}
                                      onChange={(e) => setDatosInforme({ ...datosInforme, fecha_evento_texto: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                  <button
                                    onClick={() => setMostrarModalInicio(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => confirmarInicioEvento(e)}
                                    disabled={!camposCompletos}
                                    className={`px-4 py-2 rounded font-bold transition-colors duration-200 
                                      ${camposCompletos
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}

                                  >
                                    Confirmar e Iniciar Evento
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {finalReportData && (
                            <div className="mt-3 animate-fade-in-up">
                              <BotonReporteFinal data={finalReportData.reportData} stats={finalReportData.stats} preguntas={finalReportData.preguntasPendientes || []} preguntasRespondidas={finalReportData.preguntasRespondidas || []} />
                            </div>
                          )}
                        </div>

                        {!data.asambleaActiva && (
                          <button
                            onClick={recuperarDatosDelInforme}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
                          >
                            Generar informe
                          </button>
                        )}


                        {/*3. Transmición link */}
                        <div className="border-t pt-4">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Link Transmisión Principal</label>
                          <div className="flex gap-2 mt-1">
                            <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="URL Transmisión/Meet/YouTube/Zoom" value={videoInput} onChange={e => setVideoInput(e.target.value)} />
                            <button onClick={updateVideo} className="bg-gray-800 text-white px-4 rounded font-bold text-sm hover:bg-black transition">Set</button>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-[11px] text-gray-600 font-bold flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={data.youtubeControls !== 0}
                                onChange={async (e) => {
                                  const val = e.target.checked ? 1 : 0;
                                  await fetch('/api/asamblea', { method: 'POST', body: JSON.stringify({ action: 'update_config', youtube_controls: val }) });
                                  setData(prev => ({ ...prev, youtubeControls: val }));
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              Mostrar controles de video (YouTube/Vimeo)
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subir Documento</label>
                          <div className="flex items-center gap-2 mt-1 border border-dashed border-gray-300 p-2 rounded bg-gray-50">
                            <input id="fileInput" type="file" className="w-full text-xs" onChange={e => setFile(e.target.files[0])} />
                            <button onClick={uploadFile} className="bg-blue-600 text-white p-1.5 rounded shadow">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sticky top-6">
                <div className="bg-white/40 backdrop-blur-md border border-white/50 p-5 rounded-xl shadow-lg">
                  <p className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-1">Bienvenido</p>
                  <p className="text-lg font-bold text-blue-900">{user.nombre}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-gray-600">Activo</p>
                  </div>
                </div>
                <div className={`transition-all duration-500 overflow-hidden ${isTheaterMode
                  ? 'fixed bottom-4 right-4 z-[70] w-[350px] shadow-2xl opacity-40 hover:opacity-100 transition-opacity rounded-xl border border-gray-300 bg-white/95 backdrop-blur-md'
                  : 'w-full opacity-100'
                  }`}>

                  {/* Etiqueta opcional para indicar al usuario que puede interactuar */}
                  {isTheaterMode && (
                    <div className="bg-blue-600 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest cursor-pointer">
                      Panel Interactivo (Acerca el cursor)
                    </div>
                  )}
                  {renderPanelInteractivo()}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
