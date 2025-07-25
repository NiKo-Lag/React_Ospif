"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import InternmentDetailModal from '@/components/internaciones/InternmentDetailModal';
// En el futuro, podríamos importar otros componentes aquí
// import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';

export default function SharedResourcePage() {
  const params = useParams();
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resource, setResource] = useState(null);

  useEffect(() => {
    if (token) {
      const fetchResource = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/public/share/${token}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'No se pudo cargar el recurso compartido.');
          }
          const data = await response.json();
          setResource(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchResource();
    }
  }, [token]);

  const renderResource = () => {
    if (!resource) return null;

    switch (resource.resourceType) {
      case 'internment':
        return (
          <InternmentDetailModal
            request={{ token, ...resource.data }}
            isReadOnly={true} // <-- MODO SOLO LECTURA
            onClose={() => { /* No hacer nada o redirigir */ }}
          />
        );
      
      // Futuros casos
      // case 'practice':
      //   return <AuthorizationForm initialData={resource.data} isReadOnly={true} />;
      
      default:
        return <p>Tipo de recurso no soportado.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {loading && <p>Cargando información compartida...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && renderResource()}
    </div>
  );
} 