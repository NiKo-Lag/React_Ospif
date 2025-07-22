// src/components/NotificationBell.jsx
'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/portal/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        } else {
          console.error('Error al cargar notificaciones');
        }
      } catch (error) {
        console.error('Error de red al cargar notificaciones:', error);
      }
    }

    fetchNotifications();
    
    // Opcional: Refrescar notificaciones cada cierto tiempo
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000); // Cada 5 minutos
    return () => clearInterval(interval);

  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (notificationId) => {
    // Actualización optimista para feedback visual inmediato
    setNotifications(
      notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );

    // Llamada a la API para persistir el cambio
    try {
      await fetch(`/api/portal/notifications/${notificationId}`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error al marcar la notificación como leída:', error);
      // Opcional: Revertir el estado si la API falla
      // Para ello necesitarías guardar el estado original
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
        >
          <div className="py-1" role="none">
            <div className="px-4 py-2 text-sm text-gray-700 font-semibold border-b">
              Notificaciones
            </div>
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No tienes notificaciones.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {notifications.map(notification => (
                  <li key={notification.id} className={`${notification.is_read ? 'bg-white' : 'bg-blue-50'} border-b`}>
                    <Link
                      href={`/portal/internments-panel?internmentId=${notification.internment_id}`}
                      className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
                      onClick={() => {
                        handleMarkAsRead(notification.id);
                        setIsOpen(false);
                      }}
                    >
                      <p className="font-medium">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString('es-AR')}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
