#!/bin/bash

# ColdSend Release Script
# This script automates the release process for all platforms

echo "🚀 ColdSend Release Process Starting..."
echo "========================================="

# Step 1: Check if GH_TOKEN is set
if [ -z "$GH_TOKEN" ]; then
    echo "❌ ERROR: GitHub token not found!"
    echo ""
    echo "Please set your GitHub token first:"
    echo "export GH_TOKEN='your_github_token_here'"
    echo ""
    echo "Get your token from: https://github.com/settings/personal-access-tokens/fine-grained"
    echo "Make sure to give it 'Contents' and 'Metadata' permissions for ivaavimusic/ColdSend"
    exit 1
fi

echo "✅ GitHub token found"

# Step 1.5: Check for Apple Silicon and ensure Rosetta 2 is available
if [[ $(uname -m) == "arm64" ]]; then
    echo "🍎 Detected Apple Silicon (ARM64)"
    echo "🔧 Checking Rosetta 2 for cross-platform builds..."
    
    # Check if Rosetta 2 is installed
    if ! /usr/bin/pgrep oahd >/dev/null 2>&1; then
        echo "⚠️  Rosetta 2 not running. Installing..."
        softwareupdate --install-rosetta --agree-to-license
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install Rosetta 2. You may need to install it manually."
            echo "Run: softwareupdate --install-rosetta --agree-to-license"
            exit 1
        fi
    fi
    echo "✅ Rosetta 2 ready for cross-platform builds"
fi

# Step 2: Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Building version: $VERSION"

# Step 3: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
echo "✅ Cleaned dist folder"

# Step 4: Install/update dependencies
echo "📦 Checking dependencies..."
npm install
echo "✅ Dependencies ready"

# Step 5: Build for ALL platforms
echo "🏗️  Building for ALL platforms..."
echo "This will create:"
echo "  • macOS: DMG and ZIP files (x64 + arm64)"
echo "  • Windows: EXE installer and portable (x64)"
echo "  • Linux: AppImage and DEB packages (x64)"
echo ""

# Build for all platforms with specific configuration
echo "🖥️  Building macOS packages..."
npx electron-builder --mac --arm64 --x64 --publish=never

echo "🪟  Building Windows packages..."
# Use environment variables to bypass Wine issues on Apple Silicon
export ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true
export CSC_IDENTITY_AUTO_DISCOVERY=false
arch -x86_64 npx electron-builder --win --x64 --publish=never

echo "🐧  Building Linux packages..."
# Build Linux packages with Rosetta emulation
arch -x86_64 npx electron-builder --linux --x64 --publish=never

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

echo "✅ All builds completed successfully!"

# Step 6: Show what was built
echo ""
echo "📁 Built files:"
ls -la dist/ | grep -E '\.(dmg|exe|AppImage|deb|zip)$'

# Step 7: Create GitHub release
echo ""
echo "📤 Creating GitHub release v$VERSION..."

# Check if tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo "⚠️  Tag v$VERSION already exists. Deleting and recreating..."
    git tag -d "v$VERSION" || true
    git push origin --delete "v$VERSION" || true
fi

# Create and push tag
git tag "v$VERSION"
git push origin "v$VERSION"

# Create release using GitHub CLI or electron-builder
echo "🚀 Publishing to GitHub Releases..."
npx electron-builder --publish=always

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! ColdSend v$VERSION has been built and published!"
    echo ""
    echo "📦 What was created:"
    echo "  • Cross-platform installers in dist/ folder"
    echo "  • GitHub release with all files uploaded"
    echo ""
    echo "🔗 Check your GitHub releases page:"
    echo "    https://github.com/ivaavimusic/ColdSend/releases/tag/v$VERSION"
    echo ""
    echo "🚀 Users can now download and install ColdSend!"
else
    echo "❌ Publishing failed! Check the errors above."
    echo "💡 You can still find the built files in the 'dist' folder"
    echo ""
    echo "Manual upload option:"
    echo "1. Go to: https://github.com/ivaavimusic/ColdSend/releases/new"
    echo "2. Tag: v$VERSION"
    echo "3. Upload files from dist/ folder"
    exit 1
fi

echo ""
echo "✨ Release process complete!"
