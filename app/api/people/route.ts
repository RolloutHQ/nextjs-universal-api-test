import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
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

    await wait(2000);

    // Build URL with optional pagination cursor
    const searchParams = request.nextUrl.searchParams;
    const nextCursor = searchParams.get("next");

    const params = new URLSearchParams({
      ...(nextCursor ? { next: nextCursor } : {}),
      limit: "50",
    });

    let url = `https://crm.universal.rollout.com/api/people?${params.toString()}`;

    const options = {
      headers: {
        Authorization: `Bearer ${rolloutToken}`,
        "x-rollout-credential-id": credentialId,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch people data' },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { error: "Failed to fetch people data" },
      { status: 500 },
    );
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

    const body = await request.json();

    const response = await fetch(
      "https://crm.universal.rollout.com/api/people",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rolloutToken}`,
          "x-rollout-credential-id": credentialId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const error = await response.text();
      console.error("Error creating person:", error);
      return NextResponse.json(
        { error: error || 'Failed to create person' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 },
    );
  }
}
