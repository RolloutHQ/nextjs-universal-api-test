import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { fetchCloze } from "../credentials/cloze";

export async function GET() {
  try {
    const headersList = headers();
    const rolloutToken = headersList.get("x-rollout-token");
    const credentialId = headersList.get("X-Credential-Id");

    if (!rolloutToken) {
      return NextResponse.json({ error: "No rollout token provided" }, { status: 401 });
    }
    if (!credentialId) {
      return NextResponse.json({ error: "No credential ID provided" }, { status: 400 });
    }

    const credentialsRes = await fetch("https://universal.rollout.com/api/credentials?includeData=true", {
      headers: { Authorization: `Bearer ${rolloutToken}` },
    });
    const credentials = await credentialsRes.json();
    const credential = credentials.find((cred: any) => cred.id === credentialId);

    const response = await fetchCloze(
      "https://api.cloze.com/v1/messages/opens",
      { method: "GET", headers: { "Content-Type": "application/json" } },
      { credential }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch messages" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data[0]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
