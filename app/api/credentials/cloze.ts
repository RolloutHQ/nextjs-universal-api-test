
/**
 * Makes a fetch to the Cloze API. If the response is 401, refreshes the token once and retries.
 */
export async function fetchCloze(
  url: string,
  options: RequestInit,
  { credential }: { credential: any; }
): Promise<Response> {
  const makeRequest = (token: string) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });

  const response = await makeRequest(credential.currentData.accessToken);

  return response;
}

export async function getMe({ credential }: { credential: any; }) {
  const response = await fetchCloze(
    "https://api.cloze.com/v1/user/profile",
    { method: "GET", headers: { "Content-Type": "application/json" } },
    { credential }
  );

  const data = await response.json();
  return data.profile;
}
