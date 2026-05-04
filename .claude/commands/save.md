Save a snapshot of the current site version.

Run this command:
```
node scripts/save-version.mjs "$ARGUMENTS"
```

Use the PowerShell tool with node path `C:\Program Files\nodejs\node.exe` from the project root `C:\Users\alber\Documents\Hjem\Rocky\rocky-ocean-web`.

The argument ($ARGUMENTS) is an optional label/description for this snapshot (e.g. "clean-hero" or "before-gallery-changes"). If no argument given, use "snapshot".

After running, confirm to the user that the snapshot was saved and show them the snapshot folder name.
