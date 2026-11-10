# server/

The laptop side: Python server + SQLite (FTS5 search), reached from the phone over Tailscale.

Built so far (ROADMAP 1.1-1.10, 1.22, 1.23): `vault_server/` (library folder, database, journal, scanner, songs, mine status, versions, import and phone copies, server, doctor, backup, pull), `vault_cli.py` (`init`, `check`, `import-sorting`, `scan`, `apply-sorting`, `songs`, `mains`, `import`, `fingerprint`, `serve`, `doctor`, `backup`, `pull-cloud`), self-tests `test_library.py`, `test_server.py`, `test_doctor.py`, `test_backup.py`, `test_import.py` (run each with `python server/<name>`). The library it manages lives in `E:\VaultLibrary`; this folder holds code only, never the database or audio.

Always on (2026-11-10): `server_on.ps1` makes a Windows job that runs `keep_serving.py` at log-in with no window; it starts the server and starts it again if it stops (`vault_server/keepalive.py`, test `test_keepalive.py`). `server_off.ps1` removes it.

The server reads my music folders read-only (CLAUDE.md rule 1) and writes only to its own database and Vault library folder.
