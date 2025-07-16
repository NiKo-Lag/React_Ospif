// src/app/portal/(main)/verify-member/page.jsx

"use client";

import { useState, useMemo } from 'react'; // Se importa useMemo
import toast, { Toaster } from 'react-hot-toast';
import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, UserCircleIcon } from '@heroicons/react/24/solid';

// Componente para mostrar la tarjeta de resultado del afiliado
const BeneficiaryResultCard = ({ beneficiary }) => {
    const statusInfo = beneficiary.activo
        ? { text: 'Activo', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' }
        : { text: 'Inactivo', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' };

    // --- Lógica para determinar el plan del beneficiario ---
    const planInfo = useMemo(() => {
        if (!beneficiary?.fSssTipoDeBeneficiario?.nombre) {
            return { plan: 'No especificado', color: 'text-gray-500' };
        }
        const esRelacionDependencia = beneficiary.fSssTipoDeBeneficiario.nombre.toLowerCase().includes('relacion de dependencia');
        return esRelacionDependencia ? { plan: 'PLATINO', color: 'text-green-600 font-bold' } : { plan: 'BORDO', color: 'text-yellow-600 font-bold' };
    }, [beneficiary]);

    return (
        <div className={`mt-6 p-6 bg-white rounded-lg shadow-md border-l-4 ${statusInfo.borderColor}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{beneficiary.nombre}</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {beneficiary.activo ? <CheckCircleIcon className="w-5 h-5 mr-1.5" /> : <XCircleIcon className="w-5 h-5 mr-1.5" />}
                    {statusInfo.text}
                </span>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <p><strong className="font-medium text-gray-800">CUIL:</strong> {beneficiary.cuil}</p>
                <p><strong className="font-medium text-gray-800">Documento:</strong> {beneficiary.numeroDeDocumento}</p>
                {/* --- NUEVO CAMPO: Se añade el plan --- */}
                <p><strong className="font-medium text-gray-800">Plan:</strong> <span className={planInfo.color}>{planInfo.plan}</span></p>
                <p><strong className="font-medium text-gray-800">Fecha de Nacimiento:</strong> {new Date(beneficiary.fechaNacimiento).toLocaleDateString('es-ES')}</p>
                <p><strong className="font-medium text-gray-800">Parentesco:</strong> {beneficiary.fSssParentesco?.nombre}</p>
            </div>
        </div>
    );
};

export default function VerifyMemberPage() {
    const [cuil, setCuil] = useState('');
    const [beneficiary, setBeneficiary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!/^\d{11}$/.test(cuil)) {
            toast.error('CUIL inválido. Debe contener 11 dígitos sin guiones.');
            return;
        }
        
        setLoading(true);
        setError('');
        setBeneficiary(null);
        const toastId = toast.loading('Buscando afiliado...');

        try {
            const response = await fetch(`/api/beneficiary/${cuil}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'No se encontró al afiliado.');
            }

            setBeneficiary(data);
            toast.success('Afiliado encontrado.', { id: toastId });
        } catch (err) {
            setError(err.message);
            toast.error(err.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Verificar Afiliado</h1>
                    <p className="mt-1 text-gray-600">Ingresa el CUIL del afiliado para consultar su estado actual.</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <form onSubmit={handleSearch} className="flex items-center space-x-4">
                        <div className="flex-grow">
                            <label htmlFor="cuil" className="sr-only">CUIL</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="cuil"
                                    id="cuil"
                                    value={cuil}
                                    onChange={(e) => setCuil(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ingrese el CUIL sin guiones"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </form>
                </div>

                {beneficiary && <BeneficiaryResultCard beneficiary={beneficiary} />}
                
                {error && !beneficiary && (
                    <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-lg">
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </>
    );
}
