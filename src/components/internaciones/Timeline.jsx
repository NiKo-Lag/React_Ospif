// src/components/internaciones/Timeline.jsx
'use client';

export default function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">No hay eventos de trazabilidad.</p>
      </div>
    );
  }

  // Ordenar eventos por fecha, del más reciente al más antiguo
  const sortedEvents = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {sortedEvents.map((event, eventIdx) => (
          <li key={eventIdx}>
            <div className="relative pb-8">
              {eventIdx !== sortedEvents.length - 1 ? (
                <span className="absolute left-2.5 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3 items-start">
                <div>
                  <span className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center ring-4 ring-white" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm text-gray-800 font-semibold">{event.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(event.date).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} hs
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
