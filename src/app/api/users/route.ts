import { NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, type, areaIds } = body;

    if (!name || !email || !password || !type || !areaIds) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        type,
        areaIds,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        areas: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
