import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import axios from "axios";
import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, "frontend", "dist");
const httpHost = process.env.HOST ?? "127.0.0.1";
const httpPort = Number(process.env.PORT ?? 3000);
const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";
const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434/api/generate";
const maxPromptLength = 4000;

const server = new McpServer(
  {
    name: "ollama-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

async function askOllama(prompt) {
  const response = await axios.post(ollamaUrl, {
    model: ollamaModel,
    prompt,
    stream: false
  });

  return response.data.response ?? "";
}

server.registerTool(
  "ask_ollama",
  {
    description: "Send a prompt to Ollama",
    inputSchema: z.object({
      prompt: z.string().describe("Prompt to send to the Ollama model")
    })
  },
  async ({ prompt }) => {
    try {
      const text = await askOllama(prompt);

      return {
        content: [
          {
            type: "text",
            text
          }
        ]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      return {
        content: [
          {
            type: "text",
            text: `Error contacting Ollama: ${message}`
          }
        ],
        isError: true
      };
    }
  }
);

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

async function serveStaticFile(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(frontendDir, normalizedPath);
  const resolvedPath = path.resolve(filePath);
  const indexPath = path.join(frontendDir, "index.html");

  if (!resolvedPath.startsWith(frontendDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await fs.readFile(resolvedPath);
    response.writeHead(200, {
      "Content-Type": getContentType(resolvedPath)
    });
    response.end(file);
  } catch {
    try {
      const file = await fs.readFile(indexPath);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });
      response.end(file);
    } catch {
      sendJson(response, 404, { error: "Frontend build not found. Run npm --prefix frontend run build." });
    }
  }
}

const httpServer = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "POST" && url.pathname === "/api/chat") {
    try {
      const rawBody = await readRequestBody(request);
      const parsedBody = JSON.parse(rawBody || "{}");
      const prompt = typeof parsedBody.prompt === "string" ? parsedBody.prompt.trim() : "";

      if (!prompt) {
        sendJson(response, 400, { error: "Prompt is required" });
        return;
      }

      if (prompt.length > maxPromptLength) {
        sendJson(response, 400, {
          error: `Prompt must be ${maxPromptLength} characters or less`
        });
        return;
      }

      const text = await askOllama(prompt);
      sendJson(response, 200, { reply: text });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(response, 500, { error: message });
      return;
    }
  }

  if (request.method === "GET") {
    await serveStaticFile(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
});

httpServer.listen(httpPort, httpHost, () => {
  console.error(`HTTP chat UI running at http://${httpHost}:${httpPort}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
