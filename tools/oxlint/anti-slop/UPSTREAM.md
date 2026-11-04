# Vendored anti-slop

Source: https://github.com/dmmulroy/anti-slop, commit `13909c9e07590f5a85d93c62712259fe14a883f7`.

Copied with the upstream `install-anti-slop` script from `skills/install-anti-slop/assets/anti-slop` into `tools/oxlint/anti-slop/`. Those assets match `src/` at that commit, excluding the upstream rule tests, which the install script does not copy.

`LICENSE` is the upstream MIT license, added beside the plugin because the install script does not copy it. `vendor/eslint-stylistic/LICENSE` and `UPSTREAM.md` came with the copy.

Oxlint and `@oxlint/plugins` are both pinned at 1.91.0, the current npm release when this copy was installed. Upstream's own lockfile still records 1.78.0.

The Effect plugin is present in the copy and not registered. This repository does not depend on Effect.

`anti-slop/no-runtime-typeof` stays at its default of `"error"`. JSON boundaries go through Zod, so this repository does not need a `typeof` allowlist.
