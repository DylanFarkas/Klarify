import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { type NextRequest } from "next/server";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountKey) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
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

  const idToken = authHeader.slice("Bearer ".length);
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

export { adminApp, adminAuth, adminDb, verifyRequestUser };
