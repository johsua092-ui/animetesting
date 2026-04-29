import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    // Cari user
    const user = await prisma.user.findUnique({ where: { username } })
    
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Cek password
    const isValid = await bcrypt.compare(password, user.password || '')
    
    if (!isValid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Return user data (tanpa password)
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      image: user.image
    })
  } catch (error) {
    return NextResponse.json({ error: 'Login gagal' }, { status: 500 })
  }
}
