#!/usr/bin/env python3
"""Fix JS syntax errors in tela-pipeline app_part1.js and app_part2.js"""

# Fix app_part1.js: missing ' before \')"> in kanban add button
with open('app_part1.js', 'r', encoding='utf-8') as f:
    c = f.read()

p1_old = "' + esc(stage) + \\')\">＋"
p1_new = "' + esc(stage) + '\\')\">＋"
if p1_old not in c:
    print(f"WARNING: P1 pattern not found (may already be fixed). Pattern: {repr(p1_old)}")
else:
    c = c.replace(p1_old, p1_new)
    print("app_part1.js: kanban button fix applied")

with open('app_part1.js', 'w', encoding='utf-8') as f:
    f.write(c)

# Fix app_part2.js: two bugs
with open('app_part2.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: missing ' before \')"> in danger zone delete button
p2_old1 = "+ \\')\">Delete Property"
p2_new1 = "+ '\\')\">Delete Property"
if p2_old1 not in c:
    print(f"WARNING: P2 fix1 pattern not found (may already be fixed).")
else:
    c = c.replace(p2_old1, p2_new1)
    print("app_part2.js: danger zone button fix applied")

# Fix 2: populateMarkets() on same line as // comment (commented out!)
p2_old2 = "─npopulateMarkets();"
p2_new2 = "─\npopulateMarkets();"
if p2_old2 not in c:
    print(f"WARNING: P2 fix2 pattern not found (may already be fixed).")
else:
    c = c.replace(p2_old2, p2_new2)
    print("app_part2.js: init section fix applied")

with open('app_part2.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Done!")
