import { URL } from 'node:url';

export async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { 'user-agent': 'carta-sc-build/1.0' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'carta-sc-build/1.0' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading ${url}`);
  return response.text();
}

export function absoluteUrl(value: string, base = 'https://www.sushiclub.com.ar/'): string {
  return new URL(value, base).toString();
}
