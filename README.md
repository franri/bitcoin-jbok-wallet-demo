# bitcoin-jbok-wallet-demo

Demo application made for Blockchain undergrad class. A nodejs program that manages a JBOK waallet, which generates, saves and loads its own mnemonics, makes and signs its own transactions, and uses BlockCypher's API to fetch info from and send TXs to the testnet.

---

There´s not many shenanigans, just take in mind it´s a demo and certain checks are not carried out (i.e. when sending bitcoins in option `7`, take care of writing numbers when asked for the amount and fee, and double checking the receiver as there´s no going back once you press Enter).

One thing that may be confusing is the change address. By default, the first mnemonic saved in the `keys` file (will be generated if not present when the program is first run). To change it, one must first have the change address added to the keys file (creating one (`1`) or importing a mnemonic (`2`)), find out its number (`3`), and then use that number as input for `4`.

### Notes
1. An Output (and maybe an Input too, haven´t checked that yet) will show `value: undefined` when the value of that output es 0 BTC.
1. Option `6` will show transactions which are related with the addresses in the wallet in both of two ways:
    1. the transaction has an input from the address
    1. the transaction has an output from the addess