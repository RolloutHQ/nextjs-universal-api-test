import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMe } from "../credentials/cloze";

export async function GET() {
  try {
    const headersList = headers();
    const rolloutToken = headersList.get("x-rollout-token");
    const credentialId = headersList.get("x-credential-id");

    if (!rolloutToken) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
    if (!credentialId) {
      return NextResponse.json({ error: "No credential ID provided" }, { status: 400 });
    }

    const credentialsRes = await fetch("https://universal.rollout.com/api/credentials?includeData=true", {
      headers: {
        Authorization: `Bearer ${rolloutToken}`,
      },
    });
    const credentials = await credentialsRes.json();
    const credential = credentials.find((cred: any) => cred.id === credentialId);

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const profile = await getMe({ credential, rolloutToken });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching me:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
