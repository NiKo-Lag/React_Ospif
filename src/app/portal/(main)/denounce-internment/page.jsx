// src/app/portal/(main)/denounce-internment/page.jsx

"use client";

import InternmentNotificationWizard from '@/components/internaciones/InternmentNotificationWizard';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DenounceInternmentPage() {
    const router = useRouter();

    const handleSuccess = () => {
        toast.success('¡Denuncia de internación enviada con éxito!');
        setTimeout(() => {
            router.push('/portal/dashboard');
        }, 1500);
    };

    const handleClose = () => {
        router.push('/portal/dashboard');
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="space-y-8">
                <div className="bg-white rounded-xl shadow-lg">
                   <InternmentNotificationWizard 
                        onSuccess={handleSuccess}
                        closeModal={handleClose}
                    />
                </div>
            </div>
        </>
    );
}
