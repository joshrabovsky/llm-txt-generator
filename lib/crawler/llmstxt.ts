export async function fetchExistingLlmsTxt(baseUrl: string): Promise<string | null> {
  try {
    const url = new URL("/llms.txt", baseUrl).toString();

    const response = await fetch(url, {
      headers: { "User-Agent": "llms-txt-generator/1.0" },
    });

    if (!response.ok) return null;

    return await response.text();
  } catch {
    return null;
  }
}
