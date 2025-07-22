// src/app/portal/(main)/layout.jsx

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { HomeIcon, UserGroupIcon, DocumentCheckIcon, BellIcon, ArchiveBoxIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import NotificationBell from '@/components/NotificationBell';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function PortalLayout({ children }) {
    const session = await getServerSession(authOptions);

    // This layout is specifically for providers
    if (!session || session.user.role !== 'provider') {
        redirect('/login');
    }

    const user = session.user;

    const navigation = [
        { name: 'Dashboard', href: '/portal/dashboard', icon: HomeIcon },
        { name: 'Verificar Afiliado', href: '/portal/verify-member', icon: UserGroupIcon },
        { name: 'Panel de Internaciones', href: '/portal/internments-panel', icon: ClipboardDocumentListIcon },
        { name: 'Autorizaciones Pendientes', href: '/portal/my-authorizations', icon: DocumentCheckIcon },
        { name: 'Historial de Autorizaciones', href: '/portal/history', icon: ArchiveBoxIcon },
    ];

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
                    <NotificationBell />
                    
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
