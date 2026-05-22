# Dynamic Data Policy

Tandaza backend responses must be driven by database or in-memory store state.

## Allowed Defaults

Default values are allowed when they are explicit system defaults, for example:

- a missing notification channel falling back to `in_app`
- a missing campaign status falling back to `draft`
- an empty bank/account field until payout setup exists
- demo seed records in memory mode or migrations

## Not Allowed

Runtime API responses should not invent business numbers or labels, such as:

- fixed dashboard counts
- fake payment totals
- fake role distributions
- fake sponsor names
- fake settlement bank details
- static analytics insights that do not reflect current data

## Current Enforcement

The backend now derives:

- admin overview stats from expos, countries, users, payments, and audit logs
- role distribution from users
- admin activity from audit logs
- sponsor ad owner names from ad/user data
- report insights from current counts and volumes
- visitor demographics from captured lead data
- settlement bank fields as empty defaults until payout setup exists

Seed/demo rows remain allowed because they are local bootstrap data, not hardcoded runtime calculations.
