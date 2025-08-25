
import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";

export async function GET(req: Request) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        type: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return new Response(JSON.stringify(users), { status: 200 });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const body = await req.json();
    const { name, email, password, type } = body;

    if (!name || !email || !password) {
      return new Response("Missing required fields", { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password,
        type,
      },
    });

    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (error: any) {
    logger.error(error);
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return new Response("Este e-mail já está em uso.", { status: 409 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
