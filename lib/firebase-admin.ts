import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { type NextRequest } from "next/server";

function parseServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  // Vercel sometimes wraps the value in extra quotes when pasted from .env
  const normalized = serviceAccountKey.trim().replace(/^['"]|['"]$/g, "");

  let serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  try {
    serviceAccount = JSON.parse(normalized) as typeof serviceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full service account JSON as a single-line env var in Vercel."
    );
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email, or private_key"
    );
  }

  // Vercel stores \n as literal characters; Firebase needs real newlines
  return {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
  };
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(parseServiceAccount()),
  });
}

const adminApp = getAdminApp();
const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

async function verifyRequestUser(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const credential = authHeader.slice("Bearer ".length).trim();
  if (!credential) {
    throw new Error("UNAUTHORIZED");
  }

  if (credential.startsWith("klf_")) {
    const { verifyCliToken } = await import("@/lib/platform/tokens");
    return verifyCliToken(credential);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(credential);
    return decoded.uid;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export { adminApp, adminAuth, adminDb, verifyRequestUser };
