#!/usr/bin/env python3
"""
Script to remove emojis from all documentation files
"""

import os
import re
import glob

def remove_emojis(text):
    """Remove emojis from text"""
    # Common emojis used in documentation
    emoji_patterns = [
        r'🚀', r'📚', r'🎯', r'🏗️', r'🛠️', r'💻', r'📁', r'🎨', r'🧪', r'📝',
        r'🔄', r'📡', r'🌐', r'🔐', r'🔑', r'👤', r'🛍️', r'📦', r'📊', r'🔧',
        r'🚨', r'🔍', r'🧹', r'🆘', r'❓', r'🎓', r'🤝', r'📋', r'✅', r'🎉',
        r'🔮', r'🏆', r'📱', r'🏥', r'🎮', r'📈', r'🔒', r'🌟', r'🏛️', r'📄',
        r'⚠', r'⚡', r'🔥', r'💡', r'🎪', r'🎭', r'🎨', r'🎬', r'🎵', r'🎶',
        r'🎸', r'🎹', r'🎺', r'🎻', r'🥁', r'🎤', r'🎧', r'📻', r'🎙️', r'📺',
        r'📹', r'📷', r'📸', r'🔍', r'🔎', r'🕯️', r'💡', r'🔦', r'🏮', r'📔',
        r'📕', r'📖', r'📗', r'📘', r'📙', r'📚', r'📓', r'📒', r'📃', r'📜',
        r'📄', r'📰', r'🗞️', r'📑', r'🔖', r'🏷️', r'💰', r'💴', r'💵', r'💶',
        r'💷', r'💸', r'💳', r'💎', r'⚖️', r'🔧', r'🔨', r'⛏️', r'🛠️', r'⚙️',
        r'🔩', r'⚗️', r'🔬', r'🔭', r'📡', r'💉', r'💊', r'🚪', r'🛏️', r'🛋️',
        r'🚽', r'🚿', r'🛁', r'🧴', r'🧷', r'🧹', r'🧺', r'🧻', r'🧼', r'🧽'
    ]
    
    # Remove specific emojis
    for pattern in emoji_patterns:
        text = re.sub(pattern, '', text)
    
    # Remove emoji ranges (Unicode)
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002500-\U00002BEF"  # chinese char
        u"\U00002702-\U000027B0"
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\U0001f926-\U0001f937"
        u"\U00010000-\U0010ffff"
        u"\u2640-\u2642" 
        u"\u2600-\u2B55"
        u"\u200d"
        u"\u23cf"
        u"\u23e9"
        u"\u231a"
        u"\ufe0f"  # dingbats
        u"\u3030"
                      "]+", flags=re.UNICODE)
    
    text = emoji_pattern.sub(r'', text)
    
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'^\s+', '', text, flags=re.MULTILINE)
    
    return text

def process_file(filepath):
    """Process a single file to remove emojis"""
    print(f"Processing: {filepath}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Create backup
        backup_path = filepath + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Remove emojis
        clean_content = remove_emojis(content)
        
        # Write cleaned content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(clean_content)
        
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
    for filepath in md_files:
        if os.path.isfile(filepath):
            process_file(filepath)
    
    print(f"\nProcessed {len(md_files)} files")
    print("Backup files created with .backup extension")
    print("To restore: for f in *.backup docs/*.backup; do mv \"$f\" \"${f%.backup}\"; done")

if __name__ == "__main__":
    main()
