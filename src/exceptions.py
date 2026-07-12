"""Typed exceptions for the Brent oil change point project.

Centralizing the error types keeps failure modes explicit and lets callers
(tests, scripts, the report builder) distinguish *why* a data operation failed
rather than catching a bare ``Exception``.
"""

from __future__ import annotations


class BrentDataError(Exception):
    """Base class for all data-related errors raised by this project."""


class DataFileNotFoundError(BrentDataError):
    """Raised when an expected input file is missing."""


class DataValidationError(BrentDataError):
    """Raised when a loaded dataset fails a structural or content check."""
