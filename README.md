# Ollama Chat Bot

A local chat application that connects a simple React frontend to an Ollama-backed Node.js server.

## Features

- Chat with a local Ollama model through a browser UI
- HTTP API endpoint at `/api/chat`
- MCP tool support through `ask_ollama` on stdio
- Configurable host, port, model, and Ollama URL with environment variables

## Requirements

- Node.js
- Ollama installed and running locally
- A pulled Ollama model such as `llama3`

## Install

```bash
npm install
npm --prefix frontend install
```

## Run

```bash
npm start
```

This builds the frontend and starts the server at `http://127.0.0.1:3000` by default.

## Environment Variables

- `HOST`: HTTP host to bind to. Default: `127.0.0.1`
- `PORT`: HTTP port to bind to. Default: `3000`
- `OLLAMA_MODEL`: Ollama model name. Default: `llama3`
- `OLLAMA_URL`: Ollama generate endpoint. Default: `http://localhost:11434/api/generate`

## API

### `POST /api/chat`

Request body:

```json
{
  "prompt": "Explain recursion simply"
}
```

Response body:

```json
{
  "reply": "..."
}
```

## Project Structure

```text
.
|-- frontend/
|-- server.js
|-- package.json
`-- README.md
```
