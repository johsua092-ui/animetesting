import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { username, email, password, name } = await req.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    // Cek username udah ada?
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    })
    
    if (existing) {
      return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Buat user
    const user = await prisma.user.create({
      data: {
        username,
        email: email || `${username}@oxnime.local`,
        password: hashedPassword,
        name: name || username
      }
    })

    return NextResponse.json({
      message: 'Berhasil daftar!',
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal daftar' }, { status: 500 })
  }
}
