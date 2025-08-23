# PWA Duplicate Scanner Tool

## Quick Start

Run the duplicate scanner anytime with:
```bash
npm run scan-duplicates
```

Or directly:
```bash
node tools/duplicate-scanner.js
```

## What It Scans

### 🎨 CSS Files
- Duplicate CSS selectors (classes, IDs, elements)
- Conflicting property definitions
- Duplicate keyframe animations
- Redundant media queries

### 📜 JavaScript Files  
- Duplicate function definitions
- Conflicting variable declarations
- Repeated event listeners

### 🌐 HTML Files
- Duplicate ID attributes (invalid HTML)
- Redundant script/CSS loading
- Repeated form elements

## Output

The scanner provides:
1. **Console Report**: Immediate feedback with severity levels
2. **JSON Report**: Detailed report saved to `tools/duplicate-report.json`

### Severity Levels
- **CRITICAL**: Breaks functionality (duplicate HTML IDs)
- **HIGH**: Causes conflicts (duplicate functions, CSS selectors)
- **MEDIUM**: Performance impact (duplicate animations)

## When to Run

- ✅ Before major releases
- ✅ After design updates
- ✅ When merging branches
- ✅ During code reviews
- ✅ When experiencing styling conflicts

## Automation

Add to your CI/CD pipeline:
```bash
# In your build process
npm run scan-duplicates
```

## Example Output

```
PWA DUPLICATE SCANNER REPORT
============================================================

Files Scanned: 15
Total Duplicates Found: 3

🎨 CSS DUPLICATES:
  [HIGH] CSS Selector: ".modal"
    File: styles.css
    Lines: 3257, 4755

📜 JAVASCRIPT DUPLICATES:
  [HIGH] Function Definition: "showNotification"
    File: index.html
    Lines: 1007, 1204

✅ No HTML duplicates found!
```

## Benefits

- **Prevents Conflicts**: Catches duplicate definitions before they cause issues
- **Improves Performance**: Identifies bloated CSS/JS from duplicates
- **Saves Time**: Automated scanning instead of manual review
- **Maintains Quality**: Ensures clean, maintainable codebase