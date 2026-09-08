"""
Logging setup.

One rule runs through the whole service: a log line may say *that* a request
happened, never *what* it was about. Symptom text, coordinates, account ids
and emails stay out of the logs — they are health data about an identifiable
person, and log files get copied to places the database never goes.
"""

import logging
import logging.config


LOG_FORMAT = (
    "%(asctime)s %(levelname)-8s %(name)s: %(message)s"
)


def configure_logging(level: str = "INFO") -> None:
    """Install the service-wide logging configuration. Call once, at boot."""

    logging.config.dictConfig(
        {
            "version": 1,
            # Third-party libraries configure their own loggers at import
            # time; leaving those in place keeps their warnings visible.
            "disable_existing_loggers": False,

            "formatters": {
                "standard": {
                    "format": LOG_FORMAT,
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },

            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "stream": "ext://sys.stdout",
                },
            },

            "root": {
                "handlers": ["console"],
                "level": level,
            },

            "loggers": {
                # Our own access log replaces Uvicorn's, which would
                # otherwise print a second, unlabelled line per request.
                "uvicorn.access": {
                    "handlers": [],
                    "level": "WARNING",
                    "propagate": False,
                },

                # httpx/urllib3 log full request URLs at INFO, which for the
                # Places and Geoapify calls means logging the user's exact
                # coordinates.
                "httpx": {"level": "WARNING"},
                "httpx2": {"level": "WARNING"},
                "httpcore": {"level": "WARNING"},
                "urllib3": {"level": "WARNING"},
            },
        }
    )
