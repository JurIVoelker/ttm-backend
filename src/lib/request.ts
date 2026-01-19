import { BASE_URL } from "../config";

export const request = async ({ path, method, token, body, allowError }: { path: string, method?: string, token?: string, body?: any, allowError?: boolean }) => {
  console.log(`-> [${method ?? "GET"}] ${BASE_URL}${path}`)

  const res = await fetch(BASE_URL + path, {
    method: method ?? "GET",
    headers: {
      Authorization: `Bearer ${token ?? ""}`
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    if (!allowError) {
      const json = await res.json().catch(() => (null));
      console.error("<- Error response:", json);
      throw new Error(`Request failed with status ${res.status}`);
    }
    return { error: res };
  }

  const data = await res.json();
  return { data, res };
}

export const checkHealth = async () => {
  const res = await request({ path: "/health" });
}