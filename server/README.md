# server/

The laptop side: Python server + SQLite (FTS5 search), reached from the phone over Tailscale.

Built so far (ROADMAP 1.1-1.2, 1.4-1.6, 1.8): `vault_server/` (library folder, database, journal, scanner, songs, mine status, server), `vault_cli.py` (`init`, `check`, `import-sorting`, `scan`, `apply-sorting`, `songs`, `fingerprint`, `serve`), `test_library.py` and `test_server.py` (self-tests: `python server/test_library.py`, `python server/test_server.py`). The library it manages lives in `E:\VaultLibrary`; this folder holds code only, never the database or audio.

The server reads my music folders read-only (CLAUDE.md rule 1) and writes only to its own database and Vault library folder.
