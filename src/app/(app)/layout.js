// src/app/(app)/layout.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { HomeIcon, Cog6ToothIcon, UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import LogoutButton from '@/components/ui/LogoutButton';

export default async function AppLayout({ children }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !['admin', 'auditor', 'operador'].includes(session.user.role)) {
        redirect('/login');
    }

    const user = session.user;
    let navigation = [];

    // Navigation for internal management roles
    if (user.role === 'admin') {
        navigation = [
            { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
            { name: 'Gestionar Usuarios', href: '/users', icon: UsersIcon },
            { name: 'Configuración', href: '/settings', icon: Cog6ToothIcon },
        ];
    } else if (user.role === 'auditor') {
        navigation = [
            { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
            { name: 'Autorizaciones', href: '/autorizaciones', icon: ShieldCheckIcon },
        ];
    } else if (user.role === 'operador') {
        navigation = [
            { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
            { name: 'Autorizaciones', href: '/autorizaciones', icon: ShieldCheckIcon },
        ];
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 text-2xl font-bold text-indigo-600 border-b">
                    Gestión Interna
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
                    <div className="text-right">
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                </header>
                <div className="flex-grow p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
