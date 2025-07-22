// src/components/ui/LogoutButton.jsx
'use client';

import { signOut } from 'next-auth/react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function LogoutButton() {
    return (
        <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-700 rounded-md"
        >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            Cerrar Sesión
        </button>
    );
} 