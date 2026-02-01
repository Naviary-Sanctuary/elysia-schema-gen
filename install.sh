#!/usr/bin/env bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS and Architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

# Determine binary name
case "$OS" in
  Darwin)
    # All macOS users get ARM64 binary (Intel Macs use via Rosetta 2)
    BINARY="schema-gen-macos-arm64"
    if [ "$ARCH" = "x86_64" ]; then
      echo -e "${YELLOW}Note: Intel Mac detected. Using ARM64 binary via Rosetta 2.${NC}"
    fi
    ;;
  Linux)
    case "$ARCH" in
      x86_64)
        BINARY="schema-gen-linux-x64"
        ;;
      *)
        echo -e "${RED}Unsupported architecture: $ARCH${NC}"
        echo "Only x86_64 (amd64) is supported on Linux"
        exit 1
        ;;
    esac
    ;;
  *)
    echo -e "${RED}Unsupported operating system: $OS${NC}"
    exit 1
    ;;
esac

# Get latest release URL
LATEST_URL="https://github.com/Naviary-Sanctuary/schema-gen/releases/latest/download/$BINARY"

echo -e "${GREEN}Installing schema-gen...${NC}"
echo "OS: $OS"
echo "Architecture: $ARCH"
echo "Binary: $BINARY"
echo ""

# Download binary
TEMP_FILE=$(mktemp)
if ! curl -fsSL "$LATEST_URL" -o "$TEMP_FILE"; then
  echo -e "${RED}Failed to download schema-gen${NC}"
  exit 1
fi

# Make executable
chmod +x "$TEMP_FILE"

# Install to /usr/local/bin
INSTALL_DIR="/usr/local/bin"
if [ -w "$INSTALL_DIR" ]; then
  mv "$TEMP_FILE" "$INSTALL_DIR/schema-gen"
  echo -e "${GREEN}✓ Installed to $INSTALL_DIR/schema-gen${NC}"
else
  # Try with sudo
  echo -e "${YELLOW}Permission required to install to $INSTALL_DIR${NC}"
  sudo mv "$TEMP_FILE" "$INSTALL_DIR/schema-gen"
  echo -e "${GREEN}✓ Installed to $INSTALL_DIR/schema-gen${NC}"
fi

# Verify installation
if command -v schema-gen >/dev/null 2>&1; then
  echo ""
  echo -e "${GREEN}Schema-gen successfully installed!${NC}"
  echo ""
  schema-gen --version
  echo ""
  echo "Run 'schema-gen --help' to get started"
else
  echo -e "${RED}Installation completed but schema-gen not found in PATH${NC}"
  echo "You may need to add $INSTALL_DIR to your PATH"
fi