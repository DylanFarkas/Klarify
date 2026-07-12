import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export interface GithubUserData {
  login: string;
  id: number;
}

export interface GithubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

export interface StoredGithubIntegration {
  accessToken: string;
  username: string;
  connectedAt: FirebaseFirestore.Timestamp;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubUserData> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GITHUB_USER_FETCH_FAILED:${response.status}`);
  }

  return response.json() as Promise<GithubUserData>;
}

export async function saveGithubToken(uid: string, accessToken: string): Promise<string> {
  const githubUser = await fetchGithubUser(accessToken);

  await adminDb.collection("users").doc(uid).set(
    {
      github: {
        accessToken,
        username: githubUser.login,
        connectedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  return githubUser.login;
}

export async function getGithubIntegration(
  uid: string
): Promise<StoredGithubIntegration | null> {
  const doc = await adminDb.collection("users").doc(uid).get();
  const github = doc.data()?.github as StoredGithubIntegration | undefined;
  return github ?? null;
}

export async function removeGithubIntegration(uid: string): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid);
  const doc = await docRef.get();

  if (!doc.exists || !doc.data()?.github) {
    return;
  }

  await docRef.update({
    github: FieldValue.delete(),
  });
}

export async function fetchGithubRepos(accessToken: string): Promise<GithubRepoSummary[]> {
  const repos: GithubRepoSummary[] = [];
  let page = 1;

  while (page <= 5) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GITHUB_REPOS_FETCH_FAILED:${response.status}`);
    }

    const batch = (await response.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
    }>;

    repos.push(
      ...batch.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url,
      }))
    );

    if (batch.length < 100) {
      break;
    }
    page += 1;
  }

  return repos;
}
