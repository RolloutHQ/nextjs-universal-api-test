import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { fetchCloze } from "../credentials/cloze";

async function getClozeCredential(rolloutToken: string, credentialId: string) {
  const credentialsRes = await fetch("https://universal.rollout.com/api/credentials?includeData=true", {
    headers: { Authorization: `Bearer ${rolloutToken}` },
  });
  const credentials = await credentialsRes.json();
  return credentials.find((c: any) => c.id === credentialId);
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const pageNumber = parseInt(searchParams.get("pagenumber") || "1", 10);
    const pageSize = parseInt(searchParams.get("pagesize") || "25", 10);

    const credential = await getClozeCredential(rolloutToken, credentialId);

    // Fetch total count first
    const countRes = await fetchCloze(
      "https://api.cloze.com/v1/people/find?countonly=true",
      { method: "GET" },
      { credential, rolloutToken }
    );
    const countData = await countRes.json();
    const totalCount: number = countData.availablecount ?? 0;

    // Fetch the requested page
    const response = await fetchCloze(
      `https://api.cloze.com/v1/people/find?pagenumber=${pageNumber}&pagesize=${pageSize}`,
      { method: "GET" },
      { credential, rolloutToken }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch people" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const people = (data.people || []).map((p: any) => {
      const nameParts = (p.name || "").split(" ");
      return {
        id: p.id,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        emails: p.emails || [],
        phones: p.phones || [],
      };
    });

    return NextResponse.json({ people, page: pageNumber, pageSize, totalCount });
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json({ error: "Failed to fetch people" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const credential = await getClozeCredential(rolloutToken, credentialId);
    const body = await request.json();

    const clozeBody = {
      name: `${body.firstName} ${body.lastName}`.trim(),
      emails: body.emails || [],
      addresses: body.addresses || [],
    };

    const response = await fetchCloze(
      "https://api.cloze.com/v1/people/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clozeBody),
      },
      { credential, rolloutToken }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Failed to create person" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json({ error: "Failed to create person" }, { status: 500 });
  }
}
