// src/app/api/users/route.js

import { NextResponse } from 'next/server';

// En un futuro, esta información vendrá de tu base de datos (tabla 'users')
const allUsers = [
  { id: 1, name: 'Dr. Anibal Lecter', role: 'auditor' },
  { id: 2, name: 'Dr. Gregory House', role: 'auditor' },
  { id: 3, name: 'Dra. Quinn, Medicine Woman', role: 'auditor' },
  { id: 4, name: 'Dr. John Watson', role: 'medico' },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  if (role) {
    const filteredUsers = allUsers.filter(user => user.role === role);
    return NextResponse.json(filteredUsers);
  }

  return NextResponse.json(allUsers);
}
