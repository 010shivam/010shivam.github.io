"""Rebuilds notes/index.json from the files in the notes folder."""
import json, pathlib
notes = pathlib.Path(__file__).resolve().parent.parent / "notes"
files = sorted(p.name for p in notes.iterdir()
               if p.suffix in (".md", ".txt") and not p.name.startswith("_"))
(notes / "index.json").write_text(json.dumps(files, indent=2) + "\n")
print("Listed", len(files), "notes")
