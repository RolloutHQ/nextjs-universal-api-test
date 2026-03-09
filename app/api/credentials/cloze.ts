const BASE_URL = "https://www.cloze.com/oauth";

const SCOPES = [
  "basic",
  "change_content",
  "change_relation",
  "read_content",
  "read_relation",
];

async function doRefresh({ credential, rolloutToken }: { credential: any; rolloutToken: string }): Promise<string> {
  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  const newTokenData = {
    refreshToken: data.refresh_token ?? credential.currentData.refreshToken,
    accessToken: data.access_token,
  };

  // Persist updated tokens back to Rollout
  await fetch(`https://universal.rollout.com/api/credentials/${credential.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${rolloutToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentData: newTokenData }),
  }).catch((err) => console.error("Failed to persist refreshed tokens:", err));

  return newTokenData.accessToken;
}

/**
 * Makes a fetch to the Cloze API. If the response is 401, refreshes the token once and retries.
 */
export async function fetchCloze(
  url: string,
  options: RequestInit,
  { credential, rolloutToken }: { credential: any; rolloutToken: string }
): Promise<Response> {
  const makeRequest = (token: string) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });

  const response = await makeRequest(credential.currentData.accessToken);

  if (response.status === 401) {
    const newToken = await doRefresh({ credential, rolloutToken });
    return makeRequest(newToken);
  }

  return response;
}

export async function getMe({ credential, rolloutToken }: { credential: any; rolloutToken: string }) {
  const response = await fetchCloze(
    "https://api.cloze.com/v1/user/profile",
    { method: "GET", headers: { "Content-Type": "application/json" } },
    { credential, rolloutToken }
  );

  const data = await response.json();
  return data.profile;
}
