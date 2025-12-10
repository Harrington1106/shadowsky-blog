import re
import os

file_path = r'd:\shadowsky\bookmarks.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Regex to match the bookmark cards
# Looking for <a href="..." ... class="group relative ..."> ... </a>
# We need to be careful not to match things that are already fixed or other links.
# The hardcoded cards have specific classes.

# Pattern for the opening tag of the card
card_start_pattern = r'<a href="[^"]+" target="_blank" rel="noopener" class="group relative (?:flex flex-col h-full )?bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:-translate-y-1">'

# We will iterate through the file and process matching blocks.
# However, regex for multiline nested HTML is tricky.
# A better approach might be to find the specific blocks and replace them.

# Let's try to identify the blocks that need update.
# They are <a> tags that do NOT have "flex flex-col h-full" in their class.
# And they are inside the grid containers.

def process_card(match):
    full_match = match.group(0)
    
    # Check if already processed
    if 'card-wrapper h-full' in full_match:
        return full_match
    
    # 1. Add wrapper
    # We need to wrap the whole <a> tag.
    # The match is the whole <a>...</a> block.
    
    # Update <a> class
    updated_card = re.sub(
        r'class="group relative bg-white',
        r'class="group relative flex flex-col h-full bg-white',
        full_match
    )
    
    # Update icon container
    updated_card = re.sub(
        r'(<div class="p-3 [^"]+ rounded-xl [^"]+ text-[^"]+ dark:text-[^"]+)"',
        r'\1 shrink-0"',
        updated_card
    )
    
    # Update external link icon
    updated_card = re.sub(
        r'(<i data-lucide="external-link" class="w-4 h-4 text-slate-400 [^"]+ transition-colors)"',
        r'\1 ml-2 shrink-0"',
        updated_card
    )
    
    # Update h3
    updated_card = re.sub(
        r'(<h3 class="text-lg font-bold mb-2 [^"]+ transition-colors break-words)"',
        r'\1 line-clamp-2"',
        updated_card
    )
    
    # Update p
    updated_card = re.sub(
        r'(<p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-2)"',
        r'\1 mt-auto"',
        updated_card
    )
    
    return f'<div class="card-wrapper h-full">\n{updated_card}\n</div>'

# Pattern to capture the full <a> tag content
# We assume the <a> tag starts with the specific attributes and ends with </a>
# We use non-greedy match for content
pattern = r'<a href="[^"]+" target="_blank" rel="noopener" class="group relative bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:-translate-y-1">.*?</a>'

# re.DOTALL to match newlines
new_content = re.sub(pattern, process_card, content, flags=re.DOTALL)

# Also check for cards that might have slightly different classes (e.g. bg-blue-50 in icon)
# The regex above matches the <a> tag class, which is consistent across cards.
# The icon container class varies, so we handled it with a generic regex in process_card.

# Verify if changes were made
if new_content != content:
    print("Updates found and applied.")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
else:
    print("No matching cards found to update.")

