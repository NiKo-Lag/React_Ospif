// src/app/portal/(main)/my-authorizations/page.jsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import toast, { Toaster } from 'react-hot-toast';
import Modal from '@/components/ui/Modal'; 

export default function MyAuthorizationsPage() {
    const [authorizations, setAuthorizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [openMenuId, setOpenMenuId] = useState(null);
    const [rejectModal, setRejectModal] = useState({ isOpen: false, authId: null });
    const [rejectionReason, setRejectionReason] = useState('');
    const menuRef = useRef(null);

    // Función para cargar los datos, ahora la podemos reutilizar
    const fetchAuthorizations = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/portal/my-authorizations');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudieron cargar las autorizaciones.');
            }
            const data = await response.json();
            setAuthorizations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuthorizations();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- FUNCIÓN PARA CONFIRMAR ASISTENCIA (CONECTADA A LA API) ---
    const handleConfirm = async (authId) => {
        setOpenMenuId(null); // Cierra el menú
        const toastId = toast.loading('Confirmando asistencia...');
        try {
            const response = await fetch(`/api/portal/my-authorizations/${authId}/confirm`, {
                method: 'PATCH',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            toast.success('Asistencia confirmada con éxito.', { id: toastId });
            // Volvemos a cargar los datos para que la autorización desaparezca de la lista
            fetchAuthorizations(); 
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    const handleOpenRejectModal = (authId) => {
        setRejectModal({ isOpen: true, authId });
        setOpenMenuId(null);
    };

    // --- FUNCIÓN PARA RECHAZAR (CONECTADA A LA API) ---
    const handleRejectSubmit = async () => {
        if (!rejectionReason) {
            toast.error('Debe ingresar un motivo de rechazo.');
            return;
        }
        const toastId = toast.loading('Rechazando autorización...');
        try {
            const response = await fetch(`/api/portal/my-authorizations/${rejectModal.authId}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            toast.success('Autorización rechazada con éxito.', { id: toastId });
            setRejectModal({ isOpen: false, authId: null });
            setRejectionReason('');
            // Volvemos a cargar los datos para que la autorización desaparezca de la lista
            fetchAuthorizations(); 
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    if (loading) return <div className="text-center text-gray-500">Cargando autorizaciones...</div>;
    if (error) return <div className="text-center text-red-500">Error: {error}</div>;

    return (
        <>
            <Toaster position="top-center" />
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mis Prácticas Autorizadas</h1>
                    <p className="mt-1 text-gray-600">Listado de prácticas listas para confirmar asistencia o rechazar.</p>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Práctica</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {authorizations.map((auth, index) => {
                                    const isLastItem = index >= authorizations.length - 3 && authorizations.length > 4;
                                    return (
                                        <tr key={auth.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{auth.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{auth.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{auth.beneficiary_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{auth.creationDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative inline-block text-left" ref={openMenuId === auth.id ? menuRef : null}>
                                                    <button onClick={() => setOpenMenuId(openMenuId === auth.id ? null : auth.id)} className="p-2 rounded-full hover:bg-gray-100">
                                                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                                                    </button>
                                                    {openMenuId === auth.id && (
                                                        <div className={`absolute right-0 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 ${isLastItem ? 'bottom-full mb-1 origin-bottom-right' : 'mt-2 origin-top-right'}`}>
                                                            <div className="py-1">
                                                                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Ver Detalle</a>
                                                                <button onClick={() => handleConfirm(auth.id)} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Confirmar Asistencia</button>
                                                                <button onClick={() => handleOpenRejectModal(auth.id)} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Rechazar</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {authorizations.length === 0 && (
                        <div className="text-center py-12"><p className="text-gray-500">No tienes autorizaciones pendientes de confirmación.</p></div>
                    )}
                </div>
            </div>

            <Modal isOpen={rejectModal.isOpen} onClose={() => setRejectModal({ isOpen: false, authId: null })}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Rechazar Autorización #{rejectModal.authId}</h3>
                    <p className="mt-2 text-sm text-gray-600">Por favor, ingresa el motivo del rechazo. Esta acción no se puede deshacer.</p>
                    <div className="mt-4">
                        <textarea
                            rows="4"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Ej: El afiliado no se presentó..."
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setRejectModal({ isOpen: false, authId: null })} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
                        <button onClick={handleRejectSubmit} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">Confirmar Rechazo</button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
