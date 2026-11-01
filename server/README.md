# server/

The laptop side: Python server + SQLite (FTS5 search), reached from the phone over Tailscale.

Built so far (ROADMAP 1.1-1.2): `vault_server/` (library folder, database, journal), `vault_cli.py` (`init`, `check`, `import-sorting`, `scan`, `apply-sorting`, `fingerprint`), `test_library.py` (self-test: `python server/test_library.py`). The library it manages lives in `E:\VaultLibrary`; this folder holds code only, never the database or audio.

The server reads my music folders read-only (CLAUDE.md rule 1) and writes only to its own database and Vault library folder.
