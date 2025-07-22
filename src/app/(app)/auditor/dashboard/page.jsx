// src/app/(app)/auditor/dashboard/page.jsx
"use client";

export default function AuditorDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-red-500">Página de Prueba de Auditoría</h1>
      <p className="mt-2 text-gray-700">
        Si puedes ver este mensaje, significa que el problema está en la lógica interna del componente del dashboard (en la obtención de datos o en cómo se usan los componentes). 
        Si la página sigue completamente en blanco o rota, el problema es externo (probablemente en la configuración de rutas o el layout principal).
      </p>
    </div>
  );
}
