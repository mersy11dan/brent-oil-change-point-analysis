"""Shared logging configuration.

Provides a single ``get_logger`` helper so every module logs with a consistent
format. Using module-level loggers (instead of ``print``) makes the pipeline's
behaviour observable and keeps output configurable by the caller.
"""

from __future__ import annotations

import logging

_LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_configured = False


def get_logger(name: str) -> logging.Logger:
    """Return a module logger, configuring the root handler once."""
    global _configured
    if not _configured:
        logging.basicConfig(level=logging.INFO, format=_LOG_FORMAT)
        _configured = True
    return logging.getLogger(name)
