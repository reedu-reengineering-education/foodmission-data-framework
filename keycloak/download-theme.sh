#!/bin/bash

# Configuration
GITHUB_REPO="${GITHUB_REPO:-reedu-reengineering-education/foodmission-keycloak-theme}"
THEME_VERSION="${THEME_VERSION:-latest}"  # or specify version like "v1.0.0"
THEME_DIR="./keycloak/themes"

# Create themes directory if it doesn't exist
mkdir -p "$THEME_DIR"

echo "🎨 Downloading Keycloak theme from $GITHUB_REPO..."

# Function to get download URL
get_download_url() {
    local repo="$1"
    local version="$2"
    
    if [ "$version" = "latest" ]; then
        # Get latest release
        local api_url="https://api.github.com/repos/$repo/releases/latest"
        echo "📡 Fetching latest release info..."
        
        local release_info=$(curl -s "$api_url")
        if [[ $? -ne 0 ]]; then
            echo "❌ Failed to fetch release information from GitHub API"
            return 1
        fi
        
        # Check if we got an error response
        if echo "$release_info" | grep -q '"message".*"Not Found"'; then
            echo "❌ Repository not found or no releases available"
            echo "   Check: https://github.com/$repo/releases"
            return 1
        fi
        
        DOWNLOAD_URL=$(echo "$release_info" | grep "browser_download_url.*\.jar" | head -1 | cut -d '"' -f 4)
        VERSION_TAG=$(echo "$release_info" | grep "tag_name" | head -1 | cut -d '"' -f 4)
    else
        # Get specific version
        local api_url="https://api.github.com/repos/$repo/releases/tags/$version"
        echo "📡 Fetching release info for $version..."
        
        local release_info=$(curl -s "$api_url")
        if [[ $? -ne 0 ]]; then
            echo "❌ Failed to fetch release information from GitHub API"
            return 1
        fi
        
        # Check if we got an error response
        if echo "$release_info" | grep -q '"message".*"Not Found"'; then
            echo "❌ Release $version not found"
            echo "   Check: https://github.com/$repo/releases"
            return 1
        fi
        
        DOWNLOAD_URL=$(echo "$release_info" | grep "browser_download_url.*\.jar" | head -1 | cut -d '"' -f 4)
        VERSION_TAG="$version"
    fi
}

# Get the download URL
get_download_url "$GITHUB_REPO" "$THEME_VERSION"

if [ -z "$DOWNLOAD_URL" ]; then
    echo "❌ Could not find .jar file in releases for $GITHUB_REPO"
    echo "   Make sure the repository has releases with .jar files"
    echo "   Check: https://github.com/$GITHUB_REPO/releases"
    exit 1
fi

echo "📦 Found theme version: $VERSION_TAG"
echo "🔗 Download URL: $DOWNLOAD_URL"

# Download the theme
THEME_FILE="$THEME_DIR/foodmission-keycloak-theme.jar"
echo "⬇️  Downloading theme..."
curl -L -o "$THEME_FILE" "$DOWNLOAD_URL"

if [ $? -eq 0 ] && [ -f "$THEME_FILE" ]; then
    echo "✅ Theme downloaded successfully to $THEME_FILE"
    echo "📁 File size: $(ls -lh "$THEME_FILE" | awk '{print $5}')"
    echo ""
    echo "🔄 Next steps:"
    echo "   1. Restart your Keycloak container:"
    echo "      docker-compose -f docker-compose.dev.yml restart keycloak"
    echo "   2. Go to Keycloak Admin Console: http://localhost:8080"
    echo "   3. Navigate to Realm Settings → Themes"
    echo "   4. Select your custom theme and save"
else
    echo "❌ Failed to download theme"
    exit 1
fi