import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from 'next/link';

// Este es un Componente de Servidor, por lo que podemos usar `async`
// y obtener datos directamente en el servidor antes de renderizar.
export default async function AppLayout({ children }) {
    const session = await getSession();

    if (!session) {
        // Si no hay sesión, redirigimos al login.
        redirect('/login');
    }

    // El objeto `session` contiene los datos del usuario, incluyendo los módulos permitidos.
    const { username, role, modules } = session;

    // Diccionario para los detalles de los módulos (íconos y nombres)
    const moduleDetails = {
        'autorizaciones': { name: 'Autorizaciones Médicas', href: '/autorizaciones', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        'prestadores': { name: 'Prestadores', href: '/prestadores', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.004 3.004 0 015.288 0M12 14a4 4 0 110-8 4 4 0 010 8z' },
        'ordenes-pago': { name: 'Órdenes de Pago', href: '/ordenes-pago', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        'admin-usuarios': { name: 'Admin Usuarios', href: '/admin-usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 014-1.803' }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* --- Barra Lateral (Sidebar) --- */}
            <aside className="w-64 flex-shrink-0 bg-gray-800 flex flex-col text-white">
                <div className="h-16 flex items-center justify-center border-b border-gray-700">
                    <img src="https://www.ospif.ar/resc/logo_redondo.png" alt="Logo OSPIF" className="h-10 w-auto" />
                    <span className="ml-3 font-bold text-lg">Panel OSPIF</span>
                </div>
                <nav className="flex-grow p-4 space-y-2">
                    {modules.map((key) => {
                        const details = moduleDetails[key];
                        if (!details) return null;
                        return (
                            <Link key={key} href={details.href} className="flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={details.icon}></path>
                                </svg>
                                <span>{details.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                 <div className="p-4 border-t border-gray-700">
                    {/* El botón de Logout lo haremos un componente interactivo más adelante */}
                    <a href="/api/logout" className="flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                         <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Cerrar Sesión</span>
                    </a>
                </div>
            </aside>

            {/* --- Contenido Principal --- */}
            <div className="flex-1 flex flex-col">
                <header className="bg-white shadow-sm flex items-center justify-end p-4">
                    <div className="font-semibold text-gray-700">
                        {username} <span className="text-sm font-normal text-gray-500">({role})</span>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children} {/* Aquí es donde se renderizarán las páginas de los módulos */}
                </main>
            </div>
        </div>
    );
}
