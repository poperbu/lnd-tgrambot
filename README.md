# lnd-tgrambot
Lightning Network Daemon (LND) controlled via Telegram Bot
## Description
lnd-tgrambot is a simple telegram bot, than allow you to control your Lightning Network Daemon ([LND](https://github.com/lightningnetwork/lnd)) from your mobile phone via Telegram. It is a very simple Node js script. It based on LND [gRPC API](https://api.lightning.community/).

## Instructions

1-Install your Bitcoin Node and Lightning Network Daemon (LND) -> https://dev.lightning.community/guides/installation/

2-Install [Node Js] (https://nodejs.org/en/)

3-Create your Telegram Bot -> https://core.telegram.org/bots#3-how-do-i-create-a-bot

4-Download lnd-tgrambot.js from this repository.

5-Install Node Js dependencies:
```
telegraf
sleep
grpc
meow
simple-node-logger
```

5-Run it:

 ```node rpc_bot.js -t your_telegrambot_token -i yourTelegramID```

## Command Line (or ENV) Options

Run lnd-tgrambot with -h (or --help) :

```
$node lnd-tgrambot.js -h

  Lightning Network Daemon (LND) controlled via Telegram Bot

  Usage
    $ lnd-tgram-bot [options]
  Options
    -t, --telegram-token <token> 		Your Telegram Bot Token.
    -i, --telegram-id <id>			Your Telegram ID.
    -m, --lnd-macaroon <manacaroon_path>	LND Macaroon admin file path.
    -c, --lnd-tlscert	<tls_cert_path>		LND TLS certificate file path.
    -u, --lnd-grpcurl	<grpc_url>		LND gPRC url (host:port)
    -r, --lnd-rpcproto <rpcproto_path>		LND rpc.proto file path.
    -p, --auth-password <password>		Plaintext password for payments.(optional)
    -l, --log-file <log_file_path>		Log file path.
    -d, --log-level <log_level>			Log level [ 'all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ]; default:info
    -h, --help					Show (this) usage information.


  Example
    $ lnd-tgram-bot -t my_telegram_token -i 000000
```
Or you can use ENV variables (Example):

```
export TELEGRAM_TOKEN=yourtelegramtoken
export TELEGRAM_ID=000000
export LND_MACAROON=$HOME/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
export LND_TLSCERT=$HOME/.lnd/tls.cert
export LND_GRPCURL=localhost:10009
export LND_RPCPROTO=$HOME/go/src/github.com/lightningnetwork/lnd/lnrpc/rpc.proto
export AUTH_PASSWORD=yourpassword
export LOG_FILE=out.log
```








