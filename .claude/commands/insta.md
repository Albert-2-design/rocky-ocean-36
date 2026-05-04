Generate Instagram content for Rocky Ocean using the AI agent.

The argument ($ARGUMENTS) is passed directly to the agent. Examples:
- `/insta "soloppgang ved bryggen"` — text-only post
- `/insta --photo src/assets/hero/hero-main.jpg` — photo post
- `/insta --photo bilde.HEIC "morgenseiling"` — photo + extra context
- `/insta --reel --photo still.jpg "vinterklargjøring"` — Reel/Story script
- `/insta --week src/assets/hero/hero-01.jpg src/assets/hero/hero-02.jpg ...` — weekly content plan
- `/insta --photo bilde.jpg --copy casual-no` — also copy Norwegian casual caption to clipboard

Run this command using the PowerShell tool from the project root `C:\Users\alber\Documents\Hjem\Rocky\rocky-ocean-web`:

```
& "C:\Program Files\nodejs\node.exe" scripts/instagram-agent.mjs $ARGUMENTS
```

After running, confirm where the draft was saved (in `instagram-drafts/`) and remind the user they can copy a specific variant with `--copy <variant>`.
