# lnd-tgrambot
Lightning Network Daemon (LND) controlled via Telegram Bot
## Description
lnd-tgrambot is a simple telegram bot, than allow you to control your Lightning Network Daemon ([LND](https://github.com/lightningnetwork/lnd)) from your mobile phone via Telegram. It is a very simple Node js script. It based on LND [gRPC API](https://api.lightning.community/).

## Instructions

1-Install your Bitcoin Node and Lightning Network Daemon (LND) -> https://dev.lightning.community/guides/installation/

2-Create your Telegram Bot -> https://core.telegram.org/bots#3-how-do-i-create-a-bot

3-Download lnd-tgrambot.js from this repository.

4-Install dependencies(*)

5-Run it:

 ```node rpc_bot.js -t your_telegrambot_token```

## Command Line (or ENV) Options

Run lnd-tgrambot with -h (or --help) :

```$ node lnd-tgrambot.js -h

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








