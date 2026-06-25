import { type NextRequest, NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/firebase-admin";
import { fetchGithubRepos, getGithubIntegration } from "@/lib/github-integration";

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const integration = await getGithubIntegration(uid);

    if (!integration?.accessToken) {
      return NextResponse.json({ error: "GitHub no conectado" }, { status: 401 });
    }

    const repos = await fetchGithubRepos(integration.accessToken);
    return NextResponse.json({
      username: integration.username,
      repos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (message.startsWith("GITHUB_REPOS_FETCH_FAILED:")) {
      const status = Number(message.split(":")[1]);
      return NextResponse.json(
        { error: "No se pudieron obtener los repositorios de GitHub" },
        { status: status === 401 || status === 403 ? 403 : 502 }
      );
    }

    console.error("GET /api/github/repos error:", error);
    return NextResponse.json({ error: "Error al listar repositorios" }, { status: 500 });
  }
}
