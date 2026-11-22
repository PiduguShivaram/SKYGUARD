"""Vercel entrypoint for FastAPI service."""
import os
import sys

# Ensure repository root and current service directory are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, "..", ".."))

if repo_root not in sys.path:
    sys.path.insert(0, repo_root)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from services.api.app.main import app

__all__ = ["app"]
