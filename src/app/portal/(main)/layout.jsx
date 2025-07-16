// src/app/portal/(main)/layout.jsx

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
// Se añade un nuevo ícono para el panel de internaciones
import { HomeIcon, UserGroupIcon, DocumentCheckIcon, ArrowRightOnRectangleIcon, BellIcon, ArchiveBoxIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

async function LogoutButton() {
    'use server';
    
    const logout = async () => {
        'use server';
        cookies().delete('provider_token');
        redirect('/portal/login');
    };

    return (
        <form action={logout}>
            <button type="submit" className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-700 rounded-md">
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                Cerrar Sesión
            </button>
        </form>
    );
}

export default async function PortalLayout({ children }) {
    const cookieStore = cookies();
    const token = cookieStore.get('provider_token');
    let user = null;

    try {
        if (!token) {
            redirect('/portal/login');
        }
        user = jwt.verify(token.value, process.env.JWT_SECRET_KEY);
    } catch (error) {
        console.error("Error de autenticación en el layout del portal:", error.message);
        redirect('/portal/login');
    }

    const navigation = [
        { name: 'Dashboard', href: '/portal/dashboard', icon: HomeIcon },
        { name: 'Verificar Afiliado', href: '/portal/verify-member', icon: UserGroupIcon },
        // --- NUEVO: Se añade el enlace al Panel de Internaciones ---
        { name: 'Panel de Internaciones', href: '/portal/internments-panel', icon: ClipboardDocumentListIcon },
        { name: 'Autorizaciones Pendientes', href: '/portal/my-authorizations', icon: DocumentCheckIcon },
        { name: 'Historial de Autorizaciones', href: '/portal/history', icon: ArchiveBoxIcon },
    ];

    // Simulación de notificaciones nuevas
    const hasNewNotifications = true;

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 text-2xl font-bold text-indigo-600 border-b">
                    Portal Prestador
                </div>
                <nav className="flex-grow p-4">
                    <ul className="space-y-2">
                        {navigation.map((item) => (
                            <li key={item.name}>
                                <a
                                    href={item.href}
                                    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                    <item.icon className="w-6 h-6 mr-3" />
                                    {item.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="p-4 border-t">
                    <LogoutButton />
                </div>
            </aside>

            <main className="flex-grow flex flex-col">
                <header className="bg-white shadow-sm p-4 flex justify-end items-center space-x-4">
                    <button className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                        <BellIcon className="h-6 w-6" />
                        {hasNewNotifications && (
                            <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                    </button>
                    
                    <div className="text-right">
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                </header>
                <div className="flex-grow p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
