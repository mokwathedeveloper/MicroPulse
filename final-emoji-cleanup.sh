#!/bin/bash

# Final emoji cleanup script
echo "Performing final emoji cleanup on documentation files..."

# List of files to clean
files=(
    "docs/ARCHITECTURE.md"
    "docs/API.md"
    "docs/TROUBLESHOOTING.md"
    "docs/FAQ.md"
    "docs/README.md"
    "PROJECT_SUMMARY.md"
    "QUICKSTART.md"
    "setup.sh"
    "setup.bat"
    "health-check.sh"
)

# Function to remove emojis using sed
clean_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "Cleaning: $file"
        # Create backup
        cp "$file" "$file.bak"
        
        # Remove common emojis
        sed -i 's/🚀//g; s/📚//g; s/🎯//g; s/🏗️//g; s/🛠️//g; s/💻//g; s/📁//g; s/🎨//g; s/🧪//g; s/📝//g' "$file"
        sed -i 's/🔄//g; s/📡//g; s/🌐//g; s/🔐//g; s/🔑//g; s/👤//g; s/🛍️//g; s/📦//g; s/📊//g; s/🔧//g' "$file"
        sed -i 's/🚨//g; s/🔍//g; s/🧹//g; s/🆘//g; s/❓//g; s/🎓//g; s/🤝//g; s/📋//g; s/✅//g; s/🎉//g' "$file"
        sed -i 's/🔮//g; s/🏆//g; s/📱//g; s/🏥//g; s/🎮//g; s/📈//g; s/🔒//g; s/🌟//g; s/🏛️//g; s/📄//g' "$file"
        sed -i 's/⚠️//g; s/⚡//g; s/🔥//g; s/💡//g; s/🎪//g; s/🎭//g; s/🎬//g; s/🎵//g; s/🎶//g; s/🎸//g' "$file"
        
        echo "✓ Cleaned: $file"
    else
        echo "✗ File not found: $file"
    fi
}

# Clean each file
for file in "${files[@]}"; do
    clean_file "$file"
done

echo ""
echo "Emoji cleanup completed!"
echo "Backup files created with .bak extension"
echo "To restore: for f in *.bak docs/*.bak; do mv \"\$f\" \"\${f%.bak}\"; done"
