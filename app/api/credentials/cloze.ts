const BASE_URL = " https://www.cloze.com/oauth";
import { addMinutes, addSeconds, isBefore, subSeconds } from "date-fns";

const SCOPES = [
  "basic",
  "change_content",
  "change_relation",
  "read_content",
  "read_relation",
];

function expiresIn5Minutes(expireDate: Date) {
  const in5minutes = addMinutes(Date.now(), 5);
  return isBefore(expireDate, in5minutes);
}

export async function refreshTokens({ credential }) {
  if (!expiresIn5Minutes(new Date(credential.currentData.expireDate))) {
    return credential.currentData;
  }

  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.CLOZE_CLIENT_ID,
      client_secret: process.env.CLOZE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: credential.currentData.refreshToken,
      scope: SCOPES.join(" "),
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  if (
    typeof data.access_token !== "string" ||
    typeof data.expires_in !== "number"
  ) {
    throw new Error("Invalid token response shape");
  }

  const expireDate = addSeconds(new Date(), data.expires_in).toISOString();

  return {
    refreshToken: credential.currentData.refreshToken,
    accessToken: data.access_token,
    expireDate,
  };
}

export  async function getValidAccessToken({ credential }) {
  try {
    const tokens = await refreshTokens({ credential });
    return tokens.accessToken;
  } catch (error) {
    console.error("Error refreshing Cloze tokens:", error);
    throw new Error("Failed to refresh Cloze access token");
  }
}