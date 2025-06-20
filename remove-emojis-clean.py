#!/usr/bin/env python3
"""
Script to remove emojis from documentation files while preserving formatting
"""

import os
import re
import glob

def remove_emojis_from_line(line):
    """Remove emojis from a single line while preserving formatting"""
    # Common emojis used in documentation - remove only these specific ones
    emoji_replacements = {
        '🚀': '',
        '📚': '',
        '🎯': '',
        '🏗️': '',
        '🛠️': '',
        '💻': '',
        '📁': '',
        '🎨': '',
        '🧪': '',
        '📝': '',
        '🔄': '',
        '📡': '',
        '🌐': '',
        '🔐': '',
        '🔑': '',
        '👤': '',
        '🛍️': '',
        '📦': '',
        '📊': '',
        '🔧': '',
        '🚨': '',
        '🔍': '',
        '🧹': '',
        '🆘': '',
        '❓': '',
        '🎓': '',
        '🤝': '',
        '📋': '',
        '✅': '',
        '🎉': '',
        '🔮': '',
        '🏆': '',
        '📱': '',
        '🏥': '',
        '🎮': '',
        '📈': '',
        '🔒': '',
        '🌟': '',
        '🏛️': '',
        '📄': '',
        '⚠️': '',
        '⚡': '',
        '🔥': '',
        '💡': '',
        '🎪': '',
        '🎭': '',
        '🎬': '',
        '🎵': '',
        '🎶': '',
        '🎸': '',
        '🎹': '',
        '🎺': '',
        '🎻': '',
        '🥁': '',
        '🎤': '',
        '🎧': '',
        '📻': '',
        '🎙️': '',
        '📺': '',
        '📹': '',
        '📷': '',
        '📸': '',
        '🔎': '',
        '🕯️': '',
        '🔦': '',
        '🏮': '',
        '📔': '',
        '📕': '',
        '📖': '',
        '📗': '',
        '📘': '',
        '📙': '',
        '📓': '',
        '📒': '',
        '📃': '',
        '📜': '',
        '📰': '',
        '🗞️': '',
        '📑': '',
        '🔖': '',
        '🏷️': '',
        '💰': '',
        '💴': '',
        '💵': '',
        '💶': '',
        '💷': '',
        '💸': '',
        '💳': '',
        '💎': '',
        '⚖️': '',
        '🔨': '',
        '⛏️': '',
        '⚙️': '',
        '🔩': '',
        '⚗️': '',
        '🔬': '',
        '🔭': '',
        '💉': '',
        '💊': '',
        '🚪': '',
        '🛏️': '',
        '🛋️': '',
        '🚽': '',
        '🚿': '',
        '🛁': '',
        '🧴': '',
        '🧷': '',
        '🧺': '',
        '🧻': '',
        '🧼': '',
        '🧽': ''
    }
    
    # Replace specific emojis
    for emoji, replacement in emoji_replacements.items():
        line = line.replace(emoji, replacement)
    
    # Clean up any extra spaces that might result from emoji removal
    line = re.sub(r'\s+', ' ', line)
    
    return line

def process_file(filepath):
    """Process a single file to remove emojis"""
    print(f"Processing: {filepath}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Create backup
        backup_path = filepath + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        # Process each line
        cleaned_lines = []
        for line in lines:
            cleaned_line = remove_emojis_from_line(line)
            cleaned_lines.append(cleaned_line)
        
        # Write cleaned content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)
        
        print(f"✓ Cleaned: {filepath}")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")

def main():
    """Main function"""
    print("Removing emojis from documentation files...")
    
    # Find all markdown files
    md_files = []
    
    # Root markdown files
    md_files.extend(glob.glob("*.md"))
    
    # Documentation files
    if os.path.exists("docs"):
        md_files.extend(glob.glob("docs/*.md"))
    
    # Process each file
    processed_count = 0
    for filepath in md_files:
        if os.path.isfile(filepath):
            process_file(filepath)
            processed_count += 1
    
    print(f"\nProcessed {processed_count} files")
    print("Backup files created with .backup extension")
    print("To restore: for f in *.backup docs/*.backup; do mv \"$f\" \"${f%.backup}\"; done")

if __name__ == "__main__":
    main()
