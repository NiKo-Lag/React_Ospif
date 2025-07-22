// src/lib/date-utils.js

/**
 * Cache para almacenar los feriados por año y evitar llamadas repetidas a la API.
 * @type {Map<number, Set<string>>}
 */
const holidaysCache = new Map();

/**
 * Obtiene los feriados para un año específico desde la API de Argentina Datos.
 * Formatea las fechas a 'YYYY-MM-DD' para una comparación sencilla.
 * @param {number} year - El año para el cual obtener los feriados.
 * @returns {Promise<Set<string>>} - Un Set con las fechas de los feriados.
 */
async function getHolidays(year) {
  if (holidaysCache.has(year)) {
    return holidaysCache.get(year);
  }

  try {
    const response = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`);
    if (!response.ok) {
      throw new Error(`Error al obtener los feriados para el año ${year}`);
    }
    const holidaysData = await response.json();
    
    // El formato de fecha de la API es YYYY-MM-DD, lo cual es perfecto.
    const holidaysSet = new Set(holidaysData.map(h => `${h.año}-${String(h.mes).padStart(2, '0')}-${String(h.dia).padStart(2, '0')}`));
    
    holidaysCache.set(year, holidaysSet);
    return holidaysSet;
  } catch (error) {
    console.error(error);
    // Devolver un set vacío en caso de error para no romper el cálculo.
    return new Set();
  }
}

/**
 * Calcula el número de días hábiles entre dos fechas, excluyendo fines de semana
 * y feriados de Argentina.
 * @param {string | Date} startDate - La fecha de inicio (inclusive).
 * @param {string | Date} endDate - La fecha de fin (inclusive).
 * @returns {Promise<number>} - El número total de días hábiles.
 */
export async function calculateBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalizar las fechas a medianoche para evitar problemas con las horas.
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  // Obtener todos los feriados para los años involucrados en el rango de fechas.
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  let allHolidays = new Set();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await getHolidays(year);
    yearHolidays.forEach(holiday => allHolidays.add(holiday));
  }

  let businessDays = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dateString = currentDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const isHoliday = allHolidays.has(dateString);

    if (!isWeekend && !isHoliday) {
      businessDays++;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return businessDays;
}

/**
 * Calcula el número de horas hábiles (L-V, no feriados) desde una fecha de inicio hasta ahora.
 * Usa UTC para los cálculos para evitar problemas de zona horaria.
 * @param {string | Date} startDate - La fecha de inicio.
 * @returns {Promise<number>} - El número total de horas hábiles transcurridas.
 */
export async function calculateBusinessHoursSince(startDate) {
  const start = new Date(startDate);
  const now = new Date();

  if (isNaN(start.getTime()) || now < start) {
    return 0;
  }
  
  // Obtener todos los feriados para los años involucrados.
  const startYear = start.getUTCFullYear();
  const endYear = now.getUTCFullYear();
  let allHolidays = new Set();
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await getHolidays(year);
    yearHolidays.forEach(holiday => allHolidays.add(holiday));
  }

  let hours = 0;
  let current = new Date(start);

  while (current < now) {
    const dayOfWeek = current.getUTCDay(); // 0: Domingo, 6: Sábado
    const dateString = current.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !allHolidays.has(dateString)) {
      hours++;
    }
    
    current.setUTCHours(current.getUTCHours() + 1);
  }

  return hours;
} 

/**
 * Calcula la fecha y hora de finalización después de agregar una cantidad específica de horas hábiles.
 * @param {string | Date} startDate - La fecha de inicio.
 * @param {number} businessHoursToAdd - El número de horas hábiles a añadir.
 * @returns {Promise<Date>} - La fecha de finalización calculada.
 */
export async function calculateBusinessDeadline(startDate, businessHoursToAdd) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }

  // Obtener feriados para el año actual y el siguiente, por si el plazo cruza el año.
  const startYear = start.getUTCFullYear();
  const endYear = startYear + 1;
  const allHolidays = new Set();
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await getHolidays(year);
    yearHolidays.forEach(holiday => allHolidays.add(holiday));
  }
  
  let deadline = new Date(start);
  let hoursCounted = 0;

  // Avanzamos el deadline hora por hora, pero solo contamos las horas que son hábiles.
  while (hoursCounted < businessHoursToAdd) {
    deadline.setUTCHours(deadline.getUTCHours() + 1);

    const dayOfWeek = deadline.getUTCDay(); // 0: Domingo, 6: Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const dateString = deadline.toISOString().slice(0, 10);
    const isHoliday = allHolidays.has(dateString);

    if (!isWeekend && !isHoliday) {
      hoursCounted++;
    }
  }

  return deadline;
} 