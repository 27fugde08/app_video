#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS - Centralized Python Error Logger & Try-Catch Decorator Utility
========================================================================
Provides unified error handling, structured logging, and try-catch wrappers for Python scripts.
"""

import sys
import traceback
import logging
import datetime
import functools
from typing import Callable, Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)


class SystemLogger:
    """System logger class for structured error capturing in Python Backend Services"""

    def __init__(self, module_name: str = "BackendEngine"):
        self.module_name = module_name
        self.logger = logging.getLogger(module_name)

    def log_error(self, action_name: str, error: Exception, context: Optional[dict] = None) -> dict:
        """Log structured error message with line numbers and full stack trace"""
        exc_type, exc_obj, exc_tb = sys.exc_info()
        file_name = exc_tb.tb_frame.f_code.co_filename if exc_tb else "Unknown"
        line_no = exc_tb.tb_lineno if exc_tb else 0

        error_payload = {
            "timestamp": datetime.datetime.now().isoformat(),
            "module": self.module_name,
            "action": action_name,
            "message": str(error),
            "file": file_name,
            "line": line_no,
            "traceback": traceback.format_exc(),
            "context": context or {}
        }

        self.logger.error(
            f"❌ [{action_name}] Failed at {file_name}:{line_no} - {str(error)}\n"
            f"Context: {context}\n"
            f"Traceback:\n{error_payload['traceback']}"
        )

        return error_payload

    def try_catch(self, action_name: str, fallback_value: Any = None):
        """
        Decorator for Python functions to automatically catch, log, and handle errors.
        
        Usage:
        @logger.try_catch("DownloadVideoChunk", fallback_value=False)
        def download_chunk(url):
            ...
        """
        def decorator(func: Callable):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    self.log_error(
                        action_name=action_name,
                        error=e,
                        context={"args": str(args), "kwargs": str(kwargs)}
                    )
                    return fallback_value
            return wrapper
        return decorator


def safe_execute(module_name: str, action_name: str, func: Callable, fallback_value: Any = None, *args, **kwargs):
    """
    Safely execute any Python function with built-in try-catch logging.
    """
    logger = SystemLogger(module_name)
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.log_error(action_name=action_name, error=e)
        return fallback_value


if __name__ == "__main__":
    # Demo execution
    logger = SystemLogger("BatchDownloaderTest")

    @logger.try_catch("TestFunction", fallback_value="FALLBACK_RESULT")
    def faulty_function():
        return 1 / 0

    result = faulty_function()
    print("Function Result:", result)
