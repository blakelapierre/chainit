import { h, render } from 'preact-cycle';
import bch from 'bitcore-lib-cash';
import lzs from 'lz-string';

const roots = ['bitcoincash:qqqqe3jhn7wu6t6nj5gq5z0y3pgsycd8h5jng9r3e7'];

function init() {
  if (!localStorage) {
    alert('No localStorage!!!! new key will not be saved!');
  }
  else {
    const cWIF = localStorage.getItem('privatekey');

    if (cWIF) return new bch.PrivateKey.fromWIF(lzs.decompressFromUTF16(cWIF));

    const privateKey = getAddressWithPrefix('qqq');

    localStorage.setItem('privatekey', lzs.compressToUTF16(privateKey.toWIF()));

    return privateKey;
  }
}

function createChannel () {
  if (!localStorage) return alert('No localStorage!!! new key will not be saved!');

  const privateKey = getAddressWithPrefix('qqq');

  const channelKeyCount = parseInt(localStorage.getItem(`channelKeyCount`) || '0') + 1;
  localStorage.setItem(`channelKeyCount`, channelKeyCount);
  localStorage.setItem(`channelKey-${channelKeyCount}`, lzs.compressToUTF16(privateKey.toWIF()));
  
  return privateKey;
}

function storeTransactionMessage (txid, message) {
  if (localStorage) localStorage.setItem(`T-${txid}`, lzs.compressToUTF16(message));
}

function getTransactionMessage (txid) {
  if (localStorage) return lzs.decompressFromUTF16(localStorage.getItem(`T-${txid}`));
}

function getAddressData (address) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/address/${address.toString()}`)
    .then(response => response.json())
    .then(json => json.data[Object.keys(json.data)[0]])
    .catch(error => console.log(error));
}

function getTransactionsG (txids, partialResult) {
  const {found, remaining} = txids.reduce((agg, txid) => {
    const message = getTransactionMessage(txid);

    if (message) agg.found[txid] = message;
    else agg.remaining.push(txid);

    return agg;
  }, {found: {}, remaining: []});

  partialResult(new Promise(resolve => resolve(found)));

  for (let i = 0; i < remaining.length; i += 10) {
    partialResult(getTransactions (remaining.slice(i, Math.min(remaining.length, i + 10))));
  }
}

function getTransactions (txids) {
  return fetch(`https://api.blockchair.com/bitcoin-cash/dashboards/transactions/${txids.join(',')}`)
	  .then(response => response.json())
	  .catch(error => console.log('txids', txids, error));
}

function failToNext (fnList, context) {
  
}

function sendTransaction (serialized) {
  //return sendTransactionToBlockchair_com(serialized);
  //return sendTransactionToBitcoin_com(serialized);
  return sendTransactionToBitcoin_com(serialized)
	   .then(response => {
             if (response.ok) return response;

	     return sendTransactionToBlockchair_com(serialized);
	   })
	   .then(response => response.json())
	   .then(json => console.log('broadcaster', json))
	   .catch(e => sendTransactionToBlockchair_com(serialized));
}

function sendTransactionToBlockchair_com (serialized) {
  const data = new FormData();
  data.append('data', serialized);

  return fetch('https://api.blockchair.com/bitcoin-cash/push/transaction', {method: 'POST', body: data});
	    /*.then(response => response.json())
	    .then(json => console.log('broadcasted', json));*/
}

function sendTransactionToBitcoin_com (serialized) {
  return fetch(`https://rest.bitcoin.com/v2/rawtransactions/sendRawTransaction/${serialized}`);
           /*.then(response => response.json())
	   .then(json => console.log('broadcasted', json));*/
}

function createDataTransaction (to, privateKey, data, fee, utxos) {
  const transaction = new bch.Transaction(),
        address = privateKey.toAddress().toString();

  transaction.from(utxos);

  if (to !== address) {
    transaction.to(to, bch.Transaction.DUST_AMOUNT);
  }

  transaction.addData(data)
	     .change(address)
	     .fee(fee)
	     .sign(privateKey);
  
  return transaction;
}

function loadChannelMessages(_) {
  const mutation = _.mutation;
  const channel = _.selectedChannel;
  _.messages = {};
  _.messages[channel] = _.messages[channel] || [];
    
  getAddressData(channel)
    .then(mutation(SET_ADDRESS_DATA, channel))
    .then(() => {
      getTransactionsG(_.addressData[channel].transactions, function (transactionPromise) {
        transactionPromise.then(mutation(SET_TRANSACTION_DATA, channel));	  
      });
    });
}

function runAndSetInterval(fn, t) {
  fn();
  return setInterval(fn, t);
}

const {
  INIT, 
  SEND_TRANSACTION, 
  CREATE_NEW_CHANNEL,
  SET_ADDRESS_DATA, 
  SET_TRANSACTION_DATA, 
  SET_NEW_MESSAGE_INPUT, 
  CLEAR_NEW_MESSAGE_INPUT,
  CLICKED_CHANNEL,
  IMPORT_KEY,
  EXPORT_KEY
} = {
  INIT: (_, mutation) => {
    _.inited = true;
    _.mutation = mutation;

    _.messages = {};
    _.channels = [];

    _.channels[roots[0]] = {name: 'root', id: roots[0]};

    _.addressData = {};

    _.refreshInterval = 30 * 1000;

    _.refreshTimerId = runAndSetInterval(() => {
      getAddressData(address.toString())
        .then(mutation(SET_ADDRESS_DATA, address.toString()));
      
      loadChannelMessages(_, mutation);
    }, _.refreshInterval);

    return _;
  },

  SEND_TRANSACTION: (_) => {
    if (_.newMessageInput === '' || _.newMessageInput === undefined) return;
    if (_.compressedNewMessageInput.length > 240) return;

    const utxos = _.addressData[address.toString()].utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.addressData[address.toString()].address.script_hex}));
    const fee = 284;
    const transaction = createDataTransaction(
	    _.selectedChannel, 
	    privateKey, 
	    lzs.compressToUTF16(_.newMessageInput), 
	    fee, 
            utxos);
	    /*
    const transaction = new bch.Transaction()
	                       .from( _.data.utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.data.address.script_hex})));

    if (roots[0] !== privateKey.toAddress().toString()) {
      transaction.to(roots[0], bch.Transaction.DUST_AMOUNT);
      console.log('different key', roots[0], privateKey.toAddress().toString());
    }

    transaction.change(privateKey.toAddress().toString())
	       .addData(lzs.compressToUTF16(_.newMessageInput))
	       .fee(fee)
	       .sign(privateKey);
*/
    const serialized = transaction.serialize({disableDustOutputs: true});

    sendTransaction(serialized)
	  .then(() => getAddressData(address))
	  .then(_.mutation(SET_ADDRESS_DATA))
	  .then(_.mutation(CLEAR_NEW_MESSAGE_INPUT))
	  .catch(error => console.log('broadcast error', error));

    console.log('serialized', serialized);

    return _;
  },

  CREATE_NEW_CHANNEL: (_, data) => {
    const name = prompt('New channel name');

    if (name && name !== '') {
      //const channelKey = getAddressWithPrefix('qqq');
      const channelKey = createChannel();
      const utxos = _.addressData[address.toString()].utxo.map(u => ({txId: u.transaction_hash, outputIndex: u.index, satoshis: u.value, script: _.addressData[address.toString()].address.script_hex}));

      sendTransaction(createDataTransaction(roots[0], privateKey, lzs.compressToUTF16(JSON.stringify([channelKey.toAddress().toString(), name])), 285, utxos))
        .then(result => result.json())
        .then(json => console.log('broadcasted create', result))
	.catch(error => console.log('broadcast create error', error));
    }
  },

  SET_ADDRESS_DATA: (_, address, data) => {
    _.addressData[address] = data;
    return _;
  },

  SET_TRANSACTION_DATA: (_, channel, data) => {
    if (data.data) {
      const transactions = data.data;
     // _.transactions = _.transactions.concat(data.data);

      for (let id in transactions) {
        const transaction = transactions[id];
        for (let output of transaction.outputs) {
          //if (roots[0].toString() === `bitcoincash:${output.recipient}`) continue;
          if (_.selectedChannel.toString() === `bitcoincash:${output.recipient}`) continue;
/*
        if (output.script_hex.indexOf('6a') === 0) {
          const message = lzs.decompress(new Buffer(output.script_hex.substr(8), 'hex').toString());
	  storeTransactionMessage(id, message);
	  _.messages.unshift(message);
	}
*/
	
	  const script = bch.Script.fromHex(output.script_hex);

	  let message;
          if (script.isDataOut()) {
	    for (let chunk of script.chunks) {
              if (chunk.opcodenum === 106) continue;

              message = chunk.buf.toString();
	    }
          
	    console.log({message});

	    let decompressedMessage = lzs.decompressFromUTF16(message);

            try {
              const data = JSON.parse(decompressedMessage);
	      _.channels[data[0]] = {name: data[1], id: data[0]};
	      //_.channels.push([data[0], data[1]]);
	    }
	    catch (e) {
              _.messages[channel].push(decompressedMessage);
	    }

	    storeTransactionMessage(id, decompressedMessage);
		
	    console.log(output.script_hex, script.getData().toString(), decompressedMessage, script);
	  }
	}   //console.log(script, script.isDataOut(), output, script.toString());
      }
    }
    else {
      for (let txid in data) {
	      console.log('txid', txid, data);
        try {
          const d = JSON.parse(data[txid]);
          _.channels[d[0]] = {name: d[1], id: d[0]};
          //_.channels.push([d[0], d[1]]);
	}
	catch (e) {
		console.log(data[txid], e);
          _.messages[channel].push(data[txid]);
	}
      }
    }

    return _;
  },

  SET_NEW_MESSAGE_INPUT: (_, event) => {
    _.newMessageInput = event.target.value;
    _.compressedNewMessageInput = lzs.compress(_.newMessageInput);

    return _;
  },

  CLEAR_NEW_MESSAGE_INPUT: (_) => {
    _.newMessageInput = '';
    _.compressedNewMessageInput = '';

    return _;
  },

  CLICKED_CHANNEL: (_, channel) => {
    _.selectedChannel = channel;
    loadChannelMessages(_);
    return _;
  },

  EXPORT_KEY: _ => {
    prompt('Copy compressed key!', lzs.compressToUTF16(privateKey.toWIF()));
  },

  IMPORT_KEY: _ => {
    const cWIF = prompt('Enter compressed key');
    const key = new bch.PrivateKey.fromWIF(lzs.decompressFromUTF16(cWIF));

    if (localStorage) {
      localStorage.setItem('oldprivatekey', localStorage.getItem('privatekey'));
      localStorage.setItem('privatekey', cWIF);
    }

    privateKey = key;
    address = privateKey.toAddress();
  }
};

let privateKey = init();
let address = privateKey.toAddress();

console.log(address.toString());
//console.log(getAddressWithPrefix('qqq').toAddress().toString());

function getAddressWithPrefix (prefix) {
  while (true) {
    const privateKey = new bch.PrivateKey();
    const address = privateKey.toAddress();
    const s = address.toString();

    if (s.indexOf(`bitcoincash:q${prefix}`) === 0) return privateKey;
  }
}

const Addresses = ({}, {privateKey, channels, addressData, data, mutation}) => (
  <addresses>
    <div>{privateKey.toAddress().toString()}</div>
    <div>{addressData[privateKey.toAddress().toString()] !== undefined ? (addressData[privateKey.toAddress().toString()].address.balance === 0 ? 'Send Bitcoin Cash to above address' : addressData[privateKey.toAddress().toString()].address.balance) : 'waiting for balance'}</div>
    <button onClick={mutation(EXPORT_KEY)}>Export Key</button>
    <button onClick={mutation(IMPORT_KEY)}>Import Key</button>
    {!channels ? undefined : Object.keys(channels).map(channel => <Channel channel={channels[channel]} />)}
    <button onClick={mutation(CREATE_NEW_CHANNEL)}>Create New Channel</button>
  </addresses>
);

const Transaction = ({transaction}, {}) => (
  <transaction>
    {transaction.outputs.map(output => `bitcoincash:${output.recipient}` === privateKey.toAddress().toString() ? undefined : <div>{output.recipient}{lzs.decompress(output.recipient)}</div>)}
  </transaction>
);

const Message = ({message}) => (
  <message>{message}</message>
);

const Channel = ({channel}, {mutation}) => (
  <channel title={channel.id} onClick={mutation(CLICKED_CHANNEL, channel.id)}>{channel.name}</channel>
);

const Viewer = ({channel}, {channelBalance, compressedNewMessageInput, newMessageInput, messages, transactions, channels, addressData, mutation}) => (
  <viewer>
    <channel-id>{channel}</channel-id><channel-balance>{addressData[channel] ? addressData[channel].address.balance : 'waiting for balance'}</channel-balance>
    {!messages ? undefined : messages[channel].map(message => <Message message={message} />)}
    <textarea value={newMessageInput} onInput={mutation(SET_NEW_MESSAGE_INPUT)}></textarea>
    <button onClick={mutation(SEND_TRANSACTION)}>Send</button>
    <div>{compressedNewMessageInput}</div>
    <div>{compressedNewMessageInput ? new Blob([compressedNewMessageInput]).size : '0'} / 240</div>
  </viewer>
);

const SideBySide = ({selectedChannel}) => (
  <side-by-side>
    <Addresses />
	{console.log(selectedChannel)}
    <Viewer channel={selectedChannel} />
  </side-by-side>
);

const INIT_GUI = ({}, {inited, selectedChannel, mutation}) => inited ? <GUI selectedChannel={selectedChannel} /> : mutation(INIT)(mutation);

const GUI = ({selectedChannel}) => (
  <SideBySide selectedChannel={selectedChannel}/>
);

render(
  INIT_GUI, {
    selectedChannel: roots[0],
    privateKey 
  }, document.body
);
