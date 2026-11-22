"""Vercel entrypoint for FastAPI service."""
import os
import sys
import types

current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, "..", ".."))

# 1. Ensure current_dir is at the front of sys.path
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if os.path.exists(os.path.join(repo_root, "services")) and repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# 2. When deployed on Vercel with root="services/api", this directory (/var/task)
# is the function root. Internal imports expect 'services.api.app'.
# We alias 'services' and 'services.api' into sys.modules so all nested imports resolve.
if "services" not in sys.modules:
    services_pkg = types.ModuleType("services")
    services_pkg.__path__ = []
    sys.modules["services"] = services_pkg

if "services.api" not in sys.modules:
    api_pkg = types.ModuleType("services.api")
    api_pkg.__path__ = [current_dir]
    sys.modules["services.api"] = api_pkg
    sys.modules["services"].api = api_pkg

if "app" not in sys.modules and os.path.isdir(os.path.join(current_dir, "app")):
    import app as _app_module
    sys.modules["services.api.app"] = _app_module
    sys.modules["services.api"].app = _app_module

from services.api.app.main import app

__all__ = ["app"]
