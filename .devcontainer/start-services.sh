#!/usr/bin/env bash

set -u

ROOT_DIR="/workspaces/ktf"
BACKEND_LOG="/tmp/ktf-backend.log"
FRONTEND_LOG="/tmp/ktf-frontend.log"
BACKEND_PID="/tmp/ktf-backend.pid"
FRONTEND_PID="/tmp/ktf-frontend.pid"

start_detached() {
  local log_file="$1"
  shift
  nohup setsid "$@" >"$log_file" 2>&1 < /dev/null &
  echo $!
}

is_port_listening() {
  local port="$1"
  lsof -iTCP:"$port" -sTCP:LISTEN -P -n >/dev/null 2>&1
}

start_backend() {
  if is_port_listening 3001; then
    echo "Backend už běží (port 3001)."
    return
  fi

  echo "Spouštím backend..."
  backend_pid=$(start_detached "$BACKEND_LOG" npm --prefix "$ROOT_DIR/server" start)
  echo "$backend_pid" > "$BACKEND_PID"

  # Čekat maximálně 60 s (120 × 0,5 s)
  for _ in {1..120}; do
    if is_port_listening 3001; then
      echo "Backend spuštěn (port 3001)."
      return
    fi
    sleep 0.5
  done

  echo "Backend se nespustil včas. Viz log: $BACKEND_LOG"
}

start_frontend() {
  if is_port_listening 5173; then
    echo "Frontend už běží (port 5173)."
    return
  fi

  echo "Spouštím frontend..."
  frontend_pid=$(start_detached "$FRONTEND_LOG" npm --prefix "$ROOT_DIR" run dev)
  echo "$frontend_pid" > "$FRONTEND_PID"

  for _ in {1..30}; do
    if is_port_listening 5173; then
      echo "Frontend spuštěn (port 5173)."
      return
    fi
    sleep 0.5
  done

  echo "Frontend se nespustil včas. Viz log: $FRONTEND_LOG"
}

start_backend
start_frontend

echo "Hotovo. Logy: $BACKEND_LOG, $FRONTEND_LOG | PID: $BACKEND_PID, $FRONTEND_PID"
