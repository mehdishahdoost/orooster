#!/bin/bash

# Build script for creating Debian source packages for PPA upload
# This script extracts version from Cargo.toml, updates changelog, and builds source package

set -e

# Add cargo to PATH if not already there
export PATH="$HOME/.cargo/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_TAURI_DIR="$PROJECT_ROOT/src-tauri"
DEBIAN_DIR="$SRC_TAURI_DIR/debian"
PPA_NAME="${PPA_NAME:-ppa:username/orooster}"  # Override with env var

echo -e "${GREEN}Building Debian source package for ORooster${NC}"
echo "Project root: $PROJECT_ROOT"

# Check required tools
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Install with: sudo apt install $2"
        exit 1
    fi
}

echo "Checking required tools..."
check_tool "debuild" "debhelper devscripts"
check_tool "dput" "dput-ng"
check_tool "gpg" "gnupg"

# Extract version from Cargo.toml
CARGO_TOML="$SRC_TAURI_DIR/Cargo.toml"
if [[ ! -f "$CARGO_TOML" ]]; then
    echo -e "${RED}Error: Cargo.toml not found at $CARGO_TOML${NC}"
    exit 1
fi

VERSION=$(grep "^version" "$CARGO_TOML" | head -1 | sed 's/version = "\(.*\)"/\1/')
if [[ -z "$VERSION" ]]; then
    echo -e "${RED}Error: Could not extract version from Cargo.toml${NC}"
    exit 1
fi

echo -e "${GREEN}Found version: $VERSION${NC}"

# Update debian/changelog with current version and timestamp
CHANGELOG="$DEBIAN_DIR/changelog"
if [[ ! -f "$CHANGELOG" ]]; then
    echo -e "${RED}Error: debian/changelog not found${NC}"
    exit 1
fi

# Backup original changelog
cp "$CHANGELOG" "$CHANGELOG.backup"

# Update changelog with current version and date
cat > "$CHANGELOG" << EOF
orooster ($VERSION-1) jammy; urgency=medium

  * Release version $VERSION
  * Built from Tauri application
  * Native Linux desktop client for Ollama

 -- WBH <wbh@example.com>  $(date -R)
EOF

echo -e "${GREEN}Updated changelog for version $VERSION-1${NC}"

# Clean previous builds
echo "Cleaning previous builds..."
cd "$SRC_TAURI_DIR"
rm -f ../orooster_*.tar.gz ../orooster_*.dsc ../orooster_*.changes ../orooster_*.build

# Build the application first
echo -e "${YELLOW}Building Tauri application...${NC}"
cd "$PROJECT_ROOT"
npx tauri build --bundles deb

# Create source package
echo -e "${YELLOW}Creating Debian source package...${NC}"
cd "$SRC_TAURI_DIR"

# Create orig tarball from the built application
TAR_NAME="orooster_$VERSION.orig.tar.gz"
echo "Creating orig tarball: $TAR_NAME"

# Create a temporary directory for the source
TEMP_SOURCE_DIR="/tmp/orooster-$VERSION"
rm -rf "$TEMP_SOURCE_DIR"
mkdir -p "$TEMP_SOURCE_DIR"

# Copy necessary files to temp directory
cp -r "$PROJECT_ROOT/src" "$TEMP_SOURCE_DIR/"
cp -r "$PROJECT_ROOT/public" "$TEMP_SOURCE_DIR/"
cp -r "$PROJECT_ROOT/index.html" "$TEMP_SOURCE_DIR/"
cp "$PROJECT_ROOT"/package*.json "$TEMP_SOURCE_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT"/tsconfig*.json "$TEMP_SOURCE_DIR/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/vite.config.ts" "$TEMP_SOURCE_DIR/"
cp "$PROJECT_ROOT/eslint.config.js" "$TEMP_SOURCE_DIR/"

# Copy src-tauri excluding target and other build artifacts
mkdir -p "$TEMP_SOURCE_DIR/src-tauri"
cp -r "$PROJECT_ROOT/src-tauri/src" "$TEMP_SOURCE_DIR/src-tauri/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/src-tauri/debian" "$TEMP_SOURCE_DIR/src-tauri/" 2>/dev/null || true
cp "$PROJECT_ROOT/src-tauri/Cargo.toml" "$TEMP_SOURCE_DIR/src-tauri/" 2>/dev/null || true
cp "$PROJECT_ROOT/src-tauri/Cargo.lock" "$TEMP_SOURCE_DIR/src-tauri/" 2>/dev/null || true
cp "$PROJECT_ROOT/src-tauri/tauri.conf.json" "$TEMP_SOURCE_DIR/src-tauri/" 2>/dev/null || true

# Create the tar.gz
cd /tmp
tar -czf "$SRC_TAURI_DIR/../$TAR_NAME" "orooster-$VERSION"
rm -rf "$TEMP_SOURCE_DIR"

# Build source package using debuild
echo -e "${YELLOW}Building source package with debuild...${NC}"
cd "$SRC_TAURI_DIR"
env PATH="$HOME/.cargo/bin:$PATH" debuild -S -sa -us -uc -d

# Check if source package was created successfully
SOURCE_PACKAGE="../orooster_$VERSION-1.dsc"
if [[ ! -f "$SOURCE_PACKAGE" ]]; then
    echo -e "${RED}Error: Source package not created${NC}"
    exit 1
fi

echo -e "${GREEN}Source package created successfully!${NC}"
echo "Files created:"
ls -la ../orooster_$VERSION*

# Sign the package (if GPG key is available)
if gpg --list-secret-keys 2>/dev/null | grep -q "sec"; then
    echo -e "${YELLOW}Signing source package...${NC}"
    debsign ../orooster_$VERSION-1_source.changes
    echo -e "${GREEN}Package signed successfully${NC}"
else
    echo -e "${YELLOW}Warning: No GPG key found for signing${NC}"
    echo "Set up GPG key and run: debsign ../orooster_$VERSION-1_source.changes"
fi

# Show upload command
echo -e "${GREEN}To upload to PPA, run:${NC}"
echo "dput $PPA_NAME ../orooster_$VERSION-1_source.changes"

# Dry run option
if [[ "$1" == "--dry-run" ]]; then
    echo -e "${YELLOW}Running dry-run upload test...${NC}"
    dput --dry-run "$PPA_NAME" ../orooster_$VERSION-1_source.changes
fi

echo -e "${GREEN}Build script completed successfully!${NC}"
