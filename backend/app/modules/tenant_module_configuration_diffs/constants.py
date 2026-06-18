"""Constants for tenant module configuration diffs."""

from __future__ import annotations


class ConfigurationDiffRiskLevel:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


DEFAULT_CONFIGURATION_DIFF_RISK_LEVEL = ConfigurationDiffRiskLevel.LOW

GENERATOR_SOURCE = "module_configuration_diff_generator"
