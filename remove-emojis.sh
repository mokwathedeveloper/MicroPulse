#!/bin/bash

# Script to remove emojis from all documentation files
echo "Removing emojis from documentation files..."

# Function to remove emojis from a file
remove_emojis() {
    local file="$1"
    echo "Processing: $file"
    
    # Create a backup
    cp "$file" "$file.backup"
    
    # Remove common emojis used in the documentation
    sed -i 's/🚀//g' "$file"
    sed -i 's/📚//g' "$file"
    sed -i 's/🎯//g' "$file"
    sed -i 's/🏗️//g' "$file"
    sed -i 's/🛠️//g' "$file"
    sed -i 's/💻//g' "$file"
    sed -i 's/📁//g' "$file"
    sed -i 's/🎨//g' "$file"
    sed -i 's/🧪//g' "$file"
    sed -i 's/📝//g' "$file"
    sed -i 's/🔄//g' "$file"
    sed -i 's/📡//g' "$file"
    sed -i 's/🌐//g' "$file"
    sed -i 's/🔐//g' "$file"
    sed -i 's/🔑//g' "$file"
    sed -i 's/👤//g' "$file"
    sed -i 's/🛍️//g' "$file"
    sed -i 's/📦//g' "$file"
    sed -i 's/📊//g' "$file"
    sed -i 's/🔧//g' "$file"
    sed -i 's/🚨//g' "$file"
    sed -i 's/🔍//g' "$file"
    sed -i 's/🧹//g' "$file"
    sed -i 's/🆘//g' "$file"
    sed -i 's/❓//g' "$file"
    sed -i 's/🎓//g' "$file"
    sed -i 's/🤝//g' "$file"
    sed -i 's/📋//g' "$file"
    sed -i 's/✅//g' "$file"
    sed -i 's/🎉//g' "$file"
    sed -i 's/🔮//g' "$file"
    sed -i 's/🏆//g' "$file"
    sed -i 's/📱//g' "$file"
    sed -i 's/🆘//g' "$file"
    sed -i 's/🏥//g' "$file"
    sed -i 's/🎮//g' "$file"
    sed -i 's/📈//g' "$file"
    sed -i 's/🔒//g' "$file"
    sed -i 's/🌟//g' "$file"
    sed -i 's/🏛️//g' "$file"
    sed -i 's/🎯//g' "$file"
    
    # Remove any remaining emoji patterns (Unicode ranges)
    sed -i 's/[\x{1F600}-\x{1F64F}]//g' "$file"  # Emoticons
    sed -i 's/[\x{1F300}-\x{1F5FF}]//g' "$file"  # Misc Symbols
    sed -i 's/[\x{1F680}-\x{1F6FF}]//g' "$file"  # Transport
    sed -i 's/[\x{1F1E0}-\x{1F1FF}]//g' "$file"  # Flags
    sed -i 's/[\x{2600}-\x{26FF}]//g' "$file"    # Misc symbols
    sed -i 's/[\x{2700}-\x{27BF}]//g' "$file"    # Dingbats
    
    echo "Completed: $file"
}

# Process all documentation files
if [ -d "docs" ]; then
    for file in docs/*.md; do
        if [ -f "$file" ]; then
            remove_emojis "$file"
        fi
    done
fi

# Process root markdown files
for file in *.md; do
    if [ -f "$file" ]; then
        remove_emojis "$file"
    fi
done

echo "Emoji removal completed!"
echo "Backup files created with .backup extension"
echo "To restore backups: for f in *.backup; do mv \"\$f\" \"\${f%.backup}\"; done"
