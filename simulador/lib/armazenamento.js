// Onde ficam os resultados. Na Vercel, usa o banco Redis da Upstash (Storage > Upstash Redis).
// Sem banco configurado, guarda só na memória do servidor: serve para testar, mas some ao reiniciar.
import { Redis } from "@upstash/redis";

const CHAVE = "infornet:resultados";
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const memoria = [];

export const bancoConfigurado = Boolean(redis);

export async function salvarResultado(registro) {
  if (redis) await redis.lpush(CHAVE, JSON.stringify(registro));
  else memoria.unshift(registro);
}

export async function listarResultados() {
  if (!redis) return memoria.slice();
  const itens = await redis.lrange(CHAVE, 0, -1);
  // O cliente da Upstash já converte JSON salvo em objeto; texto puro é convertido aqui.
  return itens.map((x) => (typeof x === "string" ? JSON.parse(x) : x));
}

export async function apagarResultado(id) {
  if (!redis) {
    const i = memoria.findIndex((r) => r.id === id);
    if (i !== -1) memoria.splice(i, 1);
    return;
  }
  const itens = await redis.lrange(CHAVE, 0, -1);
  for (const x of itens) {
    const r = typeof x === "string" ? JSON.parse(x) : x;
    if (r.id === id) await redis.lrem(CHAVE, 1, typeof x === "string" ? x : JSON.stringify(x));
  }
}
