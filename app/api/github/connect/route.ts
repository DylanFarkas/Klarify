import { type NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/firebase-admin";
import { handleApiError } from "@/lib/api-error";
import { getGithubIntegration, removeGithubIntegration, saveGithubToken } from "@/lib/github-integration";

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const integration = await getGithubIntegration(uid);

    if (!integration?.accessToken) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      username: integration.username,
    });
  } catch (error) {
    return handleApiError(error, "Error al obtener estado de GitHub", {
      unauthorizedMessage: "No autorizado",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json()) as { accessToken?: string };

    if (!body.accessToken) {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }

    const username = await saveGithubToken(uid, body.accessToken);
    return NextResponse.json({ username });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (message.startsWith("GITHUB_USER_FETCH_FAILED:")) {
      const status = Number(message.split(":")[1]);
      return NextResponse.json(
        { error: "Token de GitHub inválido o revocado" },
        { status: status === 401 || status === 403 ? 403 : 502 }
      );
    }

    return handleApiError(error, "Error al conectar GitHub");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    await removeGithubIntegration(uid);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return handleApiError(error, "Error al desconectar GitHub", {
      unauthorizedMessage: "No autorizado",
    });
  }
}
