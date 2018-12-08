const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
//var request = require('request')
var fs = require('fs')
var sleep = require('sleep')
var grpc = require('grpc')


process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

//CLI Arguments.
const args = require('meow') (`
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
`, { flags: { telegram_token: {alias:'t'}, telegram_id: {alias:'i'}, lnd_macaroon: {alias:'m'}, lnd_tlscert: {alias:'c'}, help: {alias:'h'}
            , lnd_grpcurl: {alias:'u'}, lnd_rpcproto: {alias: 'r'}, auth_phone: {alias:'n'}, auth_password: {alias: 'p'}, log_file: {alias: 'l'}, log_level: {alias: 'd'}}} 
).flags

const envify = k => k.replace(/([A-Z])/g, '_$1').toUpperCase()
Object.keys(args).filter(k => k.length > 1)
  .forEach(k => process.env[envify(k)] = args[k])

//CONFIG (from process.env or CLI args)
const telegram_token = process.env.TELEGRAM_TOKEN || 'myTelegramBotToken' 											// Your Telegram Bot Token.
const telegram_id = process.env.TELEGRAM_ID || 000000																// Your Telegram User ID.
const lnd_macaroon = process.env.LND_MACAROON || process.env.HOME+'/.lnd/data/chain/bitcoin/mainnet/admin.macaroon'	// LND Macaroon admin file path.
const lnd_tlscert = process.env.LND_TLSCERT || process.env.HOME+'/.lnd/tls.cert'												// LND TLS certificate file path.
const lnd_grpcurl = process.env.LND_GRPCURL || 'localhost:10009'													// LND gRPC URL.
const lnd_rpcproto = process.env.LND_RPCPROTO || process.env.HOME+'/go/src/github.com/lightningnetwork/lnd/lnrpc/rpc.proto' // LND rpc.proto file path.
const auth_phone = process.env.AUTH_PHONE || ''																		// Phone number allowed to make payments.(optional)
const auth_password = process.env.AUTH_PASSWORD || null																// Plaintext password for payments.(optional)
const log_file = process.env.LOG_FILE || 'out.log'																  	// Log File Path defaul: out.log
const log_level = process.env.LOG_LEVEL || 'info'																	// Log level [ 'all', 'debug', 'info', 'warn', 'error', 'fatal' ];

const log = require('simple-node-logger').createSimpleLogger(log_file);
log.setLevel(log_level);

const MSG_UNAUTHORIZED='Not allowed action'
const MSG_AUTHORIZED='Allowed action'

//LOGGING
var lnd_macaroon_HEX = fs.readFileSync(lnd_macaroon).toString('hex')
var lnrpc = grpc.load(lnd_rpcproto).lnrpc


var lndCert = fs.readFileSync(lnd_tlscert)
var sslCreds = grpc.credentials.createSsl(lndCert)
var macaroonCreds = grpc.credentials.createFromMetadataGenerator(function(args, callback) {
    var macaroon = fs.readFileSync(lnd_macaroon).toString('hex')
    var metadata = new grpc.Metadata()
    metadata.add('macaroon', macaroon);
    callback(null, metadata);
});


var creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
var lightning = new lnrpc.Lightning(lnd_grpcurl, creds);
var request = {} 
//payment request vars
var pay_req_step=0
var payr = {} 
var payr_txt=''

//send vars
var pay_send_step=0
var pay_send_dest=''
var pay_send_amt=0

var passwd_id=0

//TELEGRAM
const bot = new Telegraf(telegram_token)

if (log_level == 'debug'){
	bot.use(Telegraf.log())
}


//Reset steps function.
function reset_steps () {
	//console.log(pay_req_step)
	pay_req_step=0 
	pay_send_step=0 
};

//function autentication
function allow_action(msg){
	if (msg.from.id == telegram_id){
		log.info('User autentication ok: '+msg.from.id)
		return true;
	}else{
		bot.telegram.sendMessage(telegram_id, `WARNING: Some user is connected to your bot. userid: `+msg.from.id)
		log.warn('Some user is connected to your bot. userid: '+msg.from.id)
		return false;
	}

}

//KEYBOARD
bot.command('keyboard', ({ reply }) => {
  return reply('Popmin keyboard on', Markup
    .keyboard([
      ['Getinfo', 'Balances','Channels'], // Row1 with 2 buttons
      ['Send', 'PayRequest','NewInvoice'] // Row2 with 2 buttons
    ])
    .resize()
    .extra()
  )
})



//GETINFO
bot.hears('Getinfo', (ctx) => {
	reset_steps();
	if (allow_action(ctx.message)){
		lightning.getInfo(request, function(err, response) {
			log.info('GETINFO:'+'Pubkey:'+response.identity_pubkey+' Alias: '+response.alias+' Num. Peers: '+response.num_peers+'...');
			//log.debug(response.identity_pubkey)
			ctx.replyWithMarkdown('*LND NODE INFO*:\n\n'+'*PubKey*: '+response.identity_pubkey+'\n\n*Alias*: '+response.alias 
				+'\n\n*Num.Peers*: '+response.num_peers+'\n\n*BlockHeight*: '+response.block_height+'\n\n*SincedToChain*: '+response.synced_to_chain
				+'\n\n*Active Channels*: '+response.num_active_channels+'\n\n*Pending Channels*: '+response.num_pending_channels+'\n\n*Inactive Channels*: '+response.num_inactive_channels);
		});
	}else{
		ctx.reply(MSG_UNAUTHORIZED)
	}
})
//BALANCES
bot.hears('Balances', (ctx) => {
	reset_steps();
	if (allow_action(ctx.message)){
		lightning.WalletBalance(request, function(err, response) {
			log.info('CHAIN BALANCES: '+response.total_balance);
			ctx.replyWithMarkdown('*BLOCKCHAIN BALANCE*:\n\n'+'*Total*: '+response.total_balance+'\n*Confirmed:*: '+response.confirmed_balance+'\n*Unconfirmed:*: '+response.unconfirmed_balance);
		});
		lightning.ChannelBalance(request, function(err, response) {
			log.info('CHANNELS BALANCES: '+response.balance);
			ctx.replyWithMarkdown('*CHANNELS BALANCE*:\n\n'+'*Total*: '+response.balance+'\n*Pending:*: '+response.pending_open_balance);			
		});
	}else{
		ctx.reply(MSG_UNAUTHORIZED)
	}
})

//CHANNELS
//CHANNELS-ACTIVE
bot.hears('Channels', (ctx) => {
	reset_steps();
	if (allow_action(ctx.message)){
		lightning.listChannels(request, function(err, response) {
			log.info('CHANNELS:'+response);
			//ctx.editMessageText('*CHANNELS*:\n');
			var count= response.channels.length;
			//log.debug(count);
    		if(response!=null){
				for (var i=0; i < count; i++) {
					//console.log(i);
					var numc=i+1;
					ctx.replyWithMarkdown('*Chanel '+numc+' of '+count+'*:\n*Remote:*'+response.channels[i].remote_pubkey
						+'\n*Point:*'+response.channels[i].channel_point
						+'\n*ID:*'+response.channels[i].chan_id
						+'\n*Capacity:*'+response.channels[i].capacity
						+'\n*Local Balance:*'+response.channels[i].local_balance);
				}
			}else{
				ctx.reply('No active channels')
			}	
		})
	}else{
		ctx.reply(MSG_UNAUTHORIZED)		
	}	
})

//PAY SEND
bot.hears('Send', (ctx) => {
	if (allow_action(ctx.message)){
		log.info('SEND:'+ctx.message)
		reset_steps();
		pay_send_step=1
		return ctx.replyWithMarkdown(`*ENTER DESTINATION PUBKEY:*`);
	}else{
		ctx.reply(MSG_UNAUTHORIZED)		
	}
})
bot.action('send_pay_confirm', (ctx, next) => {
	if(pay_send_step==4){
		reset_steps();
		log.info('PAID TO:'+send_pay_addr);
		log.info('PAIT SATS:'+send_pay_amt);
		var sendr={ addr: send_pay_addr, amount: send_pay_amt, }
		lightning.SendCoins(sendr, function(err, response) {    	
			//console.log(response);
			//console.log(err);
			if(response!=null){
				log.info('PAyMENT TXID.'+response.txid)
				ctx.replyWithMarkdown('*PAYMENT TXID*:\n\n'+'*Error*: '+response.txid);
			}else{
				log.info('ERROR:'+err.details)
				ctx.replyWithMarkdown('*ERROR*:\n\n'+'*Error*: '+err.details);    		
			}
		})
	}else{
		reset_steps();
   		ctx.replyWithMarkdown('Invalid option');			
	}	
})

bot.action('send_pay_cancel', (ctx, next) => {
	if(pay_send_step==4){
		reset_steps();
		ctx.replyWithMarkdown('*Payment canceled*');
	}else{
		reset_steps();
   		ctx.replyWithMarkdown('Invalid option');		
	}
})

//PAY REQUEST
bot.hears('PayRequest', (ctx) => {
	reset_steps();
	if (allow_action(ctx.message)){
		log.info('PAYREQ:'+ctx.message)
		pay_req_step=1
		return ctx.replyWithMarkdown(`*ENTER PAYMENT REQUEST:*`);
	}else{
		return ctx.reply(MSG_UNAUTHORIZED)		
	}
})

bot.action('req_pay_confirm', (ctx, next) => {
	if (pay_req_step==3){
		reset_steps();
		//log.debug(payr_txt);
		var paymentr={ payment_request: payr_txt,}
		lightning.sendPaymentSync(paymentr, function(err, response) {    	
	    	log.info('PAYREQ CONFIRM:'+response);
    		//console.log(err);
    		if(err==null){
    			if(response.payment_error!=null){
    				log.info('ERROR:'+response.payment_error)
    				ctx.replyWithMarkdown('*PAYMENT INFO:*\n*Error:*'+response.payment_error);	
    			}
    			if(response.payment_route!=null){
    				log.info('PAYMENT INFO: Total Paid: '+response.payment_route.total_amt+' Satoshis')
    				ctx.replyWithMarkdown('*PAYMENT INFO:*\n*Total Paid:*'+response.payment_route.total_amt+'Satoshis');	
				}
			}else{
    			ctx.replyWithMarkdown('*ERROR*:\n\n'+'*Error*: '+err.details);    					
    		}
			//ctx.replyWithMarkdown('*PAYMENT INFO:*\n*Error:'+response.payment_error+'\n*Route:*'+response.payment_route)
   		})
   	}else{
   		reset_steps();
   		ctx.replyWithMarkdown('Invalid option');
	}	
})

bot.action('req_pay_cancel', (ctx, next) => {
	if (pay_req_step==3){
		reset_steps();
		log.info('PAYMENT CANCELLED')
		ctx.replyWithMarkdown('*Payment canceled*');
	}else{
		reset_steps();
		ctx.replyWithMarkdown('Invalid Option');
	}
})

//Wizards
bot.on('text', (ctx) => {
	if (pay_req_step==1){
		//DECODE PAYREQ
		payr = { pay_req: ctx.message.text,} 
		lightning.decodePayReq(payr, function(err, response) {
			//log.debug(response);
			if (response != null) {
				ctx.replyWithMarkdown('*PAYMENT REQUEST INFORMATION*:\n\n'+'*Destination*: '+response.destination+'\n*Hash:*: '+response.payment_hash
										+'\n*Satoshis*: '+response.num_satoshis+'\n*Timestamp:*: '+response.timestamp+'\n*Expires:*: '+response.expiry
										+'\n*Description*: '+response.description);
				sleep.sleep(3);
				//if (response.num_satoshis==0) !!!
				payr_txt=ctx.message.text
				if(auth_password==null){
					pay_req_step=3
					ctx.replyWithMarkdown('*PAY '+response.num_satoshis+' SATOSHIS TO '+response.destination+' ?*',
						Markup.inlineKeyboard([
							Markup.callbackButton('Yes', 'req_pay_confirm'),
							Markup.callbackButton('No', 'req_pay_cancel')
						]).extra())
				}else{
					pay_req_step=2
					ctx.replyWithMarkdown('*PAY '+response.num_satoshis+' SATOSHIS TO '+response.destination+' ?*')
					ctx.replyWithMarkdown('*Enter Password:*')
				}
			}else{
				reset_steps();
				return ctx.reply('Unable to decode payment request')
			}
  		})
	}else{
		if(pay_req_step==2){
			pwd=ctx.message.text
			if(pwd==auth_password){
				pay_req_step=3
				ctx.replyWithMarkdown('*PAY ?*',
							Markup.inlineKeyboard([
								Markup.callbackButton('Yes', 'req_pay_confirm'),
								Markup.callbackButton('No', 'req_pay_cancel')
						]).extra())
			}else{
				reset_steps()
				ctx.replyWithMarkdown('*Password incorrect!*')				
			}		
		}
		if(pay_send_step==1){
			send_pay_addr=ctx.message.text
			pay_send_step=2
			return ctx.replyWithMarkdown(`*ENTER AMOUNT OF SATOSHiS TO SEND:*`);
		}else{
			if(pay_send_step==2){
				send_pay_amt=ctx.message.text
				if (auth_password==null){
					pay_send_step=4
   					ctx.replyWithMarkdown('*PAY '+send_pay_amt+' SATOSHIS TO ?*'+send_pay_addr,
						Markup.inlineKeyboard([
							Markup.callbackButton('Yes', 'send_pay_confirm'),
							Markup.callbackButton('No', 'send_pay_cancel')
					]).extra())
				}else{
					pay_send_step=3
					ctx.replyWithMarkdown('*Enter Password:*')

				}
			}else{
				if(pay_send_step==3){
					pwd=ctx.message.text
					if(pwd==auth_password){
						pay_send_step=4
						ctx.replyWithMarkdown('*PAY '+send_pay_amt+' SATOSHIS TO ?*'+send_pay_addr,
							Markup.inlineKeyboard([
								Markup.callbackButton('Yes', 'send_pay_confirm'),
								Markup.callbackButton('No', 'send_pay_cancel')
						]).extra())
					}else{
						reset_steps()
						ctx.replyWithMarkdown('*Password incorrect!*')
					}
				}
			}	

		}
  		//return ctx.reply('Invalid option')
	}		
})

bot.startPolling()