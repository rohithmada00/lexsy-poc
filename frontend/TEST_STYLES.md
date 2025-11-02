# Testing Tailwind CSS

If styles aren't loading, try:

1. **Restart the dev server** - Tailwind config changes require a restart
2. **Hard refresh browser** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Clear Vite cache** - Delete `node_modules/.vite` if it exists
4. **Check browser console** - Look for CSS loading errors
5. **Check Network tab** - Verify `index.css` is loading with proper content

The current setup uses:
- Tailwind CSS v4.1.16
- @tailwindcss/postcss plugin
- Traditional @tailwind directives (should work with v4)

