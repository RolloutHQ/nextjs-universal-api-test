const BASE_URL = "https://www.cloze.com/oauth";

const SCOPES = [
  "basic",
  "change_content",
  "change_relation",
  "read_content",
  "read_relation",
];

async function doRefresh({ credential }: { credential: any; }): Promise<string> {
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
    refreshToken: credential.currentData.refreshToken,
    accessToken: data.access_token,
  };

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
    const newToken = await doRefresh({ credential });
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
