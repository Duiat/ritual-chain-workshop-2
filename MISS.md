# What actually bit me

`Hairline` and `ZeroStake` look the same in a wallet.

I set `HAIRLINE = 0.004 ether`. First ink I sent was `0.003` and I kept staring at `ZeroStake` because that is the only revert the slides name. The tx was `Hairline`. Same trap at the top: `26 ether` is `Overdrawn`, not "betting closed".

I printed the custom error selector instead of guessing from the overlay.

Also: `liveSheets` first pass used `for (uint256 i = total; i >= 1; i--)`. When `i` is 1, `i--` wraps a uint256. The loft hung. It is `i > 0` now.
