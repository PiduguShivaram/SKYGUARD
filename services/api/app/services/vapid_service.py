"""VAPID (Voluntary Application Server Identification) key management and claims service."""
import base64
import os
from pathlib import Path
from typing import Dict, Tuple

import cryptography.hazmat.primitives.serialization as ser
from py_vapid import Vapid

from services.api.app.config import settings

_VAPID_INSTANCE = None
_PUBLIC_KEY_B64 = None


def get_or_create_vapid() -> Tuple[Vapid, str]:
    """Load or generate a persistent NIST P-256 VAPID keypair.
    
    Returns:
        Tuple of (Vapid instance, URL-safe base64 uncompressed public key).
    """
    global _VAPID_INSTANCE, _PUBLIC_KEY_B64

    if _VAPID_INSTANCE is not None and _PUBLIC_KEY_B64 is not None:
        return _VAPID_INSTANCE, _PUBLIC_KEY_B64

    # Determine key file path
    key_path = Path(settings.VAPID_KEY_FILE)
    if not key_path.is_absolute():
        if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            key_path = Path("/tmp") / settings.VAPID_KEY_FILE
        else:
            key_path = Path(__file__).resolve().parent.parent / settings.VAPID_KEY_FILE

    vapid = None

    # Check if PEM file exists on disk
    if key_path.exists():
        try:
            with open(key_path, "rb") as f:
                pem_data = f.read()
            vapid = Vapid.from_pem(pem_data)
        except Exception as exc:
            print(f"[VAPID] Warning: Failed to load existing VAPID PEM ({exc}). Regenerating...")

    # If not found or invalid, generate new keypair and persist
    if vapid is None:
        vapid = Vapid()
        vapid.generate_keys()
        try:
            os.makedirs(key_path.parent, exist_ok=True)
            with open(key_path, "wb") as f:
                f.write(vapid.private_pem())
            print(f"[VAPID] Generated new persistent VAPID keypair at: {key_path}")
        except Exception as exc:
            print(f"[VAPID] Notice: Could not save VAPID PEM to disk ({exc}), keeping in-memory.")

    # Export uncompressed point in base64url format for web browser PushManager.subscribe
    pub_bytes = vapid.public_key.public_bytes(
        encoding=ser.Encoding.X962,
        format=ser.PublicFormat.UncompressedPoint,
    )
    pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode("ascii").rstrip("=")

    _VAPID_INSTANCE = vapid
    _PUBLIC_KEY_B64 = pub_b64

    return _VAPID_INSTANCE, _PUBLIC_KEY_B64


def get_vapid_public_key() -> str:
    """Return the URL-safe base64 public key (applicationServerKey) for browser Web Push subscriptions."""
    _, pub_key = get_or_create_vapid()
    return pub_key


def get_vapid_private_pem() -> str:
    """Return the private key in PEM string format for pywebpush dispatch."""
    vapid, _ = get_or_create_vapid()
    return vapid.private_pem().decode("utf-8")


def get_vapid_claims() -> Dict[str, str]:
    """Return the VAPID JWT claims dict including contact URI."""
    return {"sub": settings.VAPID_CLAIM_EMAIL}
