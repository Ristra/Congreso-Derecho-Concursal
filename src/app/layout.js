'use client';
import "./globals.css";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import AgendaList from "@/components/AgendaList";
import Image from "next/image";

export default function RootLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [timeActive, setTimeActive] = useState("00:00:00");
    const [formSubmitting, setFormSubmitting] = useState(false);

    const [preguntasPendientes, setPreguntasPendientes] = useState(0);

    // Estado para el menú lateral
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // En escritorio arranca abierto
    const [isMobile, setIsMobile] = useState(false);

    // Estados para archivos visuales
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedMode, setSelectedMode] = useState(null);
    const [isAgendaOpen, setIsAgendaOpen] = useState(false);
    const [isConfigLoginOpen, setIsConfigLoginOpen] = useState(false);

    const formRef = useRef(null);

    const TawkToChat = null;

    // Configuración del Banner
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState('');

    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [bannerPatrocinadores, setBannerPatrocinadores] = useState(null);
    const [uploadingSponsors, setUploadingSponsors] = useState(false);

    const handleSponsorUpload = async (e) => {
        e.preventDefault();
        if (!bannerPatrocinadores) {
            alert('Por favor, seleccione una imagen panorámica.');
            return;
        }

        setUploadingSponsors(true);
        const formData = new FormData();
        formData.append('banner', bannerPatrocinadores);

        try {
            const res = await fetch('api/bannerPatrocinador', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                alert('Banner de patrocinadores actualizado correctamente!');
                setBannerPatrocinadores(null);
                setIsSponsorModalOpen(false); // Cierrra pop up al terminar
            } else {
                alert('Hubo un error al subir el banner.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Falló la conexión con el servidor');
        } finally {
            setUploadingSponsors(false);
        }
    };

    const handleBannerChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    // Envia imagen a la API
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setMensaje('');

        const formData = new FormData();
        formData.append('banner', file);

        try {
            const res = await fetch('/login/banner', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setMensaje('¡Banner actualizado correctamente!');
                setFile(null);
                setPreview(null);

                // Trigger 
                setTimeout(() => {
                    setMensaje('');
                }, 3000);
            } else {
                setMensaje('Error al subir el banner');
            }
        } catch (error) {
            setMensaje('Error de conexión');
        }
        setLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        const storedUser = localStorage.getItem('usuario_asamblea');
        if (storedUser) {
            setUsuario(JSON.parse(storedUser));
        } else if (pathname !== '/login') {
            router.push('/login');
        }

        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsMobile(true);
                setIsSidebarOpen(false);
            } else {
                setIsMobile(false);
                setIsSidebarOpen(true);
            }
        };

        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pathname, router]);

    useEffect(() => {
        if (!usuario || !usuario.id) return;
        if (pathname === '/login') return;

        const fetchFreshData = async () => {
            try {
                const res = await fetch('/api/usuarios');
                if (res.ok) {
                    const users = await res.json();
                    const me = users.find(u => u.id === usuario.id);

                    if (me) {
                        if (me.estado === 'Offline') {
                            localStorage.removeItem('usuario_asamblea');
                            setUsuario(null);
                            alert("Tu sesión ha sido finalizada por el administrador.");
                            window.location.href = '/login';
                            return;
                        }

                        const changed =
                            me.ultimo_login !== usuario.ultimo_login ||
                            me.estado !== usuario.estado ||
                            me.registro_completado !== usuario.registro_completado;

                        if (changed) {
                            setUsuario(prev => ({ ...prev, ...me }));
                            localStorage.setItem('usuario_asamblea', JSON.stringify({ ...usuario, ...me }));
                        }
                    } else {
                        localStorage.removeItem('usuario_asamblea');
                        window.location.href = '/login';
                    }
                }
                if (isAdmin) {
                    const resPreguntas = await fetch('/api/qa', { cache: 'no-store' });
                    if (resPreguntas.ok) {
                        const dataPreguntas = await resPreguntas.json();
                        const pendientes = dataPreguntas.filter(p => p.estado !== 'respondida' && p.estado !== 'descartada').length;
                        setPreguntasPendientes(pendientes);
                    }
                }
            } catch (error) { console.error("Error sync", error); }

        };

        fetchFreshData();
        const syncer = setInterval(fetchFreshData, 5000);
        return () => clearInterval(syncer);
    }, [usuario, pathname]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsAgendaOpen(false);
                setIsConfigLoginOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc)
    })

    useEffect(() => {
        let interval;
        const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
        if (usuario && usuario.ultimo_login && usuario.estado === 'Online') {
            interval = setInterval(() => {
                const start = new Date(usuario.ultimo_login).getTime();
                const now = new Date().getTime();
                const diff = now - start;
                if (diff > MAX_SESSION_MS) {
                    clearInterval(interval);
                    handleLogout();
                    alert("Tu sesión ha expirado por inactividad.");
                    return;
                }
                if (diff >= 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    const h = hours < 10 ? "0" + hours : hours;
                    const m = minutes < 10 ? "0" + minutes : minutes;
                    const s = seconds < 10 ? "0" + seconds : seconds;
                    setTimeActive(`${h}:${m}:${s}`);
                } else { setTimeActive("00:00:00"); }
            }, 1000);
        } else { setTimeActive("00:00:00"); }
        return () => clearInterval(interval);
    }, [usuario]);

    const handleLogout = async () => {
        if (usuario && usuario.id) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: usuario.id })
                });
            } catch (error) { console.error(error); }
        }
        localStorage.removeItem('usuario_asamblea');
        setUsuario(null);
        setTimeActive("00:00:00");
        router.push('/login');
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleAttendanceSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(formRef.current);

        if (!formData.get('nombre_empresa') || !formData.get('nit') || !formData.get('celular') || !formData.get('modo_asistencia')) {
            alert("Por favor completa todos los campos obligatorios marcados con *");
            return;
        }

        setFormSubmitting(true);

        const modo = formData.get('modo_asistencia');
        const updatedUser = { ...usuario, registro_completado: 1, modo_asistencia: modo };

        setUsuario(updatedUser);
        localStorage.setItem('usuario_asamblea', JSON.stringify(updatedUser));

        alert("Registro completado. Bienvenido al Evento");

        window.location.href = '/asamblea';

        setFormSubmitting(false);
    };

    if (!mounted) return <html lang="es" suppressHydrationWarning><body suppressHydrationWarning></body></html>;

    const isAdmin = usuario?.rol === 'Admin' || usuario?.rol === 'admin';

    if (pathname === '/login') {
        return (
            <html lang="es" suppressHydrationWarning>
                <body suppressHydrationWarning className="bg-gray-900 font-sans h-screen flex justify-center items-center">
                    {children}
                    {!isAdmin && TawkToChat}
                </body>
            </html>
        );
    }

    const isActive = (path) => pathname === path ? "bg-[#2f3542] text-white border-l-4 border-blue-500" : "text-gray-400 hover:bg-[#2f3542] hover:text-white";

    return (
        <html lang="es" suppressHydrationWarning>
            <body suppressHydrationWarning className="bg-gradient-to-br from-gray-100 to-gray-300 font-sans h-screen overflow-hidden flex flex-col md:flex-row">

                {/* --- HEADER MÓVIL CON BOTÓN DE CERRAR SESIÓN --- */}
                <div className="md:hidden h-16 bg-[#181b21] flex items-center justify-between px-4 text-white z-50 fixed w-full top-0 left-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="font-bold text-lg">Congreso Colombiano Derecho Concursal</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                            {(usuario?.nombre || usuario?.nombre_empresa || '?').charAt(0)}
                        </div>
                        {/* BOTON CERRAR SESION MOVIL */}
                        <button onClick={handleLogout} className="bg-red-600 p-1.5 rounded-full text-white hover:bg-red-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                {/* --- SIDEBAR --- */}
                <aside
                    className={`
                bg-[#1e2129]/80 backdrop-blur-md text-gray-300 flex flex-col shadow-xl transition-all duration-300 ease-in-out z-40
                ${isMobile ? 'fixed inset-y-0 left-0 w-64 mt-16' : (isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden')}
                ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            `}
                >
                    {/* Header Sidebar Desktop */}
                    <div className="h-16 hidden md:flex items-center px-4 bg-[#181b21]/50 border-b border-gray-700 justify-between">
                        <h1> 
                            <Image
                                src="/logo-congreso.png"
                                alt="Logo Congreso Derecho Concursal"
                                width={50}
                                height={30}
                                priority
                            />
                        </h1>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                    <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                        <Link href="/" className={`flex items-center justify-between px-4 py-3 rounded-md transition-colors whitespace-nowrap ${isActive('/')}`}>
                            <div className="flex items-center">
                                <span className="mr-3 text-xl">🏛️</span>
                                <span className="font-medium">Sala Principal</span>
                            </div>

                            {/* BURBUJA DE NOTIFICACIÓN PARA EL ADMIN */}
                            {isAdmin && preguntasPendientes > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                                    {preguntasPendientes}
                                </span>
                            )}
                        </Link>
                        <button onClick={() => setIsAgendaOpen(true)} className="w-full flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap text-gray-400 hover:bg-[#2f3542] hover:text-white">
                            <span className="mr-3 text-xl">📅</span>
                            <span className="font-medium">Agenda</span>
                        </button>
                        {isAdmin && (
                            <div className="pt-6 mt-4 border-t border-gray-700">
                                <p className="px-4 text-xs font-bold text-gray-500 uppercase mb-2 whitespace-nowrap">Administrador</p>
                                <Link href="/usuarios" className={`flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap ${isActive('/usuarios')}`}>
                                    <span className="mr-3 text-xl">⚙️</span>
                                    <span className="font-medium">Gestión Usuarios</span>
                                </Link>

                                <Link href="/documentos" className={`flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap ${isActive('/documentos')}`}>
                                    <span className="mr-3 text-xl">📂</span>
                                    <span className="font-medium">Gestión Archivos</span>
                                </Link>

                                {/* Botón para pop-up banner */}

                                <button onClick={() => setIsConfigLoginOpen(true)} className="w-full flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap text-gray-400 hover:bg-[#2f3542] hover:text-white">
                                    <span className="mr-3 text-xl">🖼️</span>
                                    <span className="font-medium">Configurar Login</span>
                                </button>

                                <button
                                    onClick={() => setIsSponsorModalOpen(true)}
                                    className="w-full flex items-center px-4 py-3 rounded-md transition-colors whitespace-nowrap text-gray-400 hover:bg-[#2f3542] hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <span className="mr-3 text-xl">📢</span>
                                    <span className="font-medium">Banner Patrocinadores</span>
                                </button>
                            </div>
                        )}
                    </nav>

                    <div className="p-4 bg-[#181b21]/50 border-t border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {(usuario?.nombre || usuario?.nombre_empresa || '?').charAt(0)}
                            </div>
                            <div className={`overflow-hidden transition-all duration-300 ${!isSidebarOpen && !isMobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                <p className="text-sm font-semibold text-white truncate w-32">
                                    {usuario?.nombre || usuario?.nombre_empresa || 'Usuario'}
                                </p>
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                                    En línea <span className="text-gray-400 ml-1 font-mono">({timeActive})</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* --- OVERLAY MOBILE --- */}
                {isMobile && isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-transparent z-30" /*--- className="fixed inset-0 bg-white/5 backdrop-blur-sm z-30"---*/
                        style={{ top: '64px' }}
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}

                <div className="flex-1 flex flex-col min-w-0 h-full relative">

                    {/* Header Desktop */}
                    <header className="hidden md:flex h-16 bg-white shadow-sm items-center justify-between px-4 md:px-8 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            {!isSidebarOpen && (
                                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 hover:text-blue-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            )}
                            <h2 className="text-lg md:text-xl font-bold text-blue-900 truncate">
                                {pathname === '/' && '🏛️ Sala Virtual'}
                                {pathname === '/orden-dia' && '📅 Agenda'}
                                {pathname === '/usuarios' && '👥 Gestión de Usuarios'}
                                {pathname === '/historial' && '📜 Historial de Votaciones'}
                                {pathname === '/documentos' && '📂 Archivos del Sistema'}
                                {pathname === '/reporte-planchas' && '📈 Reporte Electoral (Planchas)'}
                            </h2>
                        </div>

                        <button onClick={handleLogout} className="text-red-600 border border-red-200 px-3 py-1 md:px-4 md:py-1 rounded hover:bg-red-50 text-xs md:text-sm font-medium transition whitespace-nowrap">
                            Cerrar Sesión
                        </button>
                    </header>

                    <main className="flex-1 overflow-auto bg-gray-100 p-4 md:p-6 pt-20 md:pt-6">
                        {children}
                    </main>
                </div>

                {/* --- Chat Tawk.to Oculto para Admins --- */}
                {!isAdmin && TawkToChat}

                {/* --- MODAL DE AGENDA POP UP --- */}
                {isAgendaOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsAgendaOpen(false)}
                    >
                        <div
                            className="relative bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-fade-in-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-gray-800">📅 Agenda</h2>
                                <button
                                    onClick={() => setIsAgendaOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 font-bold transition-colors"
                                >
                                    X
                                </button>
                            </div>
                            {/* Contenido Temporal de la agenda */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="space-y-4 text-gray-600">
                                    <AgendaList />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuración Patrocinadores */}
                {isSponsorModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">


                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-gray-800">📢 Actualizar Patrocinadores</h2>
                                <button
                                    onClick={() => setIsSponsorModalOpen(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    X
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 mb-2">
                                Sube la imagen panorámica que se mostrará en la interfaz principal del evento.
                            </p>

                            <form onSubmit={handleSponsorUpload} className="flex flex-col gap-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setBannerPatrocinadores(e.target.files[0])}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 rounded-md p-2"
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsSponsorModalOpen(false)}
                                        className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!bannerPatrocinadores || uploadingSponsors}
                                        className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition ${!bannerPatrocinadores || uploadingSponsors
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                    >
                                        {uploadingSponsors ? 'Subiendo...' : 'Guardar Banner'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Confiugración Login */}
                {isConfigLoginOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsConfigLoginOpen(false)}
                    >
                        <div
                            className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-fade-in-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-gray-800">🖼️ Configuración de Login</h2>
                                <button
                                    onClick={() => setIsConfigLoginOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 font-bold transition-colors"
                                >
                                    X
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                <p className="text-sm text-gray-500 mb-6">
                                    Sube una imagen para cambiar el aspecto del Login. Recomendado: 1200x1200px (Formato cuadrado o vertical).
                                </p>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleBannerChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0d1e3d]/10 file:text-[#0d1e3d] hover:file:bg-[#0d1e3d]/20 cursor-pointer"
                                    />
                                    {preview && (
                                        <div className="mt-4">
                                            <p className="text-sm font medium mb-2">Vista previa:</p>
                                            <img src={preview} alt="Preview" className="h-48 rounded-lg object-contain bg-gray-100 p-2 border border-gray-200" />
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!file || loading}
                                        className={`w-full py-3 rounded-lg text-white font-bold transition-all mt-4 shadow-md ${!file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0d1e3d] hover:bg-[#cc1b1b]'}`}
                                    >
                                        {loading ? 'Subiendo e implementando...' : 'Guardar y Actualizar Login'}
                                    </button>
                                    {mensaje && (
                                        <p className={`text-center font-medium mt-3 ${mensaje.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                                            {mensaje}
                                        </p>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </body>
        </html >
    );
}
