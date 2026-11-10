"""Keeps the Vault server running, with no window. Windows starts this at log-in once it's turned on:

    powershell -File server\\server_on.ps1      turn on (also: restart the server after new server code)
    powershell -File server\\server_off.ps1     turn off; nothing stays scheduled or running

Not meant to be run by hand (it prints nothing: it runs under pythonw). What it does is written to server-log.txt in
the library folder. The work is in vault_server/keepalive.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vault_server.keepalive import keep_serving  # noqa: E402

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(1)
    sys.exit(keep_serving(sys.argv[1]))
