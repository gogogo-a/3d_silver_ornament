#!/usr/bin/env bash
set -euo pipefail

PORT=9456
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$APP_DIR/.deploy"
LOG_FILE="$LOG_DIR/server-${PORT}.log"

echo "==> Deploying app in: $APP_DIR"
echo "==> Target port: $PORT"

get_port_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$PORT" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v p=":$PORT" '
      $4 ~ p {
        if (match($0, /pid=[0-9]+/)) {
          pid = substr($0, RSTART + 4, RLENGTH - 4);
          print pid;
        }
      }
    ' || true
    return
  fi
}

PIDS="$(get_port_pids | sort -u | tr '\n' ' ' | xargs echo -n || true)"
if [[ -n "${PIDS}" ]]; then
  echo "==> Port $PORT is occupied by PID(s): $PIDS"
  echo "==> Stopping existing process..."
  kill $PIDS 2>/dev/null || true
  sleep 1

  STILL_RUNNING="$(get_port_pids | sort -u | tr '\n' ' ' | xargs echo -n || true)"
  if [[ -n "${STILL_RUNNING}" ]]; then
    echo "==> Force killing PID(s): $STILL_RUNNING"
    kill -9 $STILL_RUNNING 2>/dev/null || true
  fi
else
  echo "==> Port $PORT is free."
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed. Please install Node.js first."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> pnpm not found, trying to install..."
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@latest --activate
  elif command -v npm >/dev/null 2>&1; then
    npm i -g pnpm
  else
    echo "ERROR: neither corepack nor npm found. Cannot install pnpm."
    exit 1
  fi
fi

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

echo "==> Installing dependencies with pnpm..."
pnpm install

echo "==> Starting server with pnpm on port $PORT..."
PORT="$PORT" nohup pnpm start > "$LOG_FILE" 2>&1 &
NEW_PID=$!

sleep 2
if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "==> Started successfully. PID: $NEW_PID"
  echo "==> URL: http://<your-linux-ip>:$PORT"
  echo "==> Log: $LOG_FILE"
else
  echo "ERROR: server failed to start. Check log: $LOG_FILE"
  exit 1
fi
