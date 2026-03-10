#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat <<EOF
Usage: $0 <host|guest> <version>

Start the e2e host or guest app with a specific SDK version.

Arguments:
  host|guest    Which app to start
  version       SDK version to install:
                  - A published version (e.g. 1.0.1, 1.1.6)
                  - "latest" for the latest published version
                  - "local" to use locally-built packages from the repo

Examples:
  $0 host 1.1.7    # host on 3000, expects guest on 3002
  $0 guest 1.0.1   # guest on 3002
  $0 host latest   # host on 3000
  $0 guest local   # locally-built packages on 3002

Ports:
  host  → 3000
  guest → 3002
EOF
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

APP_TYPE="$1"
VERSION="$2"

case "$APP_TYPE" in
  host)
    APP_DIR="$SCRIPT_DIR/host-app"
    PORT=3000
    ;;
  guest)
    APP_DIR="$SCRIPT_DIR/guest-app"
    PORT=3002
    ;;
  *)
    echo "Error: first argument must be 'host' or 'guest', got '$APP_TYPE'"
    usage
    ;;
esac

echo "=== Starting $APP_TYPE app (version: $VERSION) on port $PORT ==="

cd "$APP_DIR"

if [[ "$VERSION" == "local" ]]; then
  # --- Local mode: build and copy packages from repo ---
  echo "Building SDK packages..."
  (cd "$REPO_ROOT" && npm run build)

  # Determine which packages this app needs
  if [[ "$APP_TYPE" == "host" ]]; then
    PACKAGES=(uix-core uix-host uix-host-react)
  else
    PACKAGES=(uix-core uix-guest)
  fi

  # Install non-SDK dependencies
  rm -f package-lock.json
  npm install

  for pkg in "${PACKAGES[@]}"; do
    TARGET="$APP_DIR/node_modules/@adobe/$pkg"
    SOURCE_DIST="$REPO_ROOT/packages/$pkg/dist"
    SOURCE_PKG="$REPO_ROOT/packages/$pkg/package.json"

    echo "  Copying $pkg..."
    rm -rf "$TARGET"
    mkdir -p "$TARGET"
    cp -R "$SOURCE_DIST"/* "$TARGET"/
    cp "$SOURCE_PKG" "$TARGET/package.json"
  done

  # Clear webpack cache so CRA picks up the fresh dist files
  rm -rf "$APP_DIR/node_modules/.cache"

  echo "Local packages installed."

else
  # --- Published version mode ---
  echo "Installing SDK packages at version $VERSION..."

  rm -f package-lock.json

  if [[ "$APP_TYPE" == "host" ]]; then
    npm install "@adobe/uix-host-react@$VERSION" "@adobe/uix-host@$VERSION" "@adobe/uix-core@$VERSION"
  else
    npm install "@adobe/uix-guest@$VERSION" "@adobe/uix-core@$VERSION"
  fi

  npm install
  echo "SDK packages installed at version $VERSION."
fi

echo "Starting dev server on port $PORT..."
PORT=$PORT npm start
